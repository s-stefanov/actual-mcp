/**
 * Authentication module for MCP server.
 *
 * Supports three modes:
 * - none: No authentication
 * - bearer: Static bearer token validation
 * - oauth: OAuth 2.0 with token introspection or JWT validation
 */
import { type RequestHandler } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { getOAuthProtectedResourceMetadataUrl } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { type OAuthMetadata } from '@modelcontextprotocol/sdk/shared/auth.js';
import {
  MCP_BEARER_TOKEN,
  MCP_OAUTH_AUDIENCE,
  MCP_OAUTH_CLIENT_ID,
  MCP_OAUTH_CLIENT_SECRET,
  MCP_OAUTH_DISCOVERY_RETRIES,
  MCP_OAUTH_DISCOVERY_RETRY_DELAY_MS,
  MCP_OAUTH_EXPECTED_ISSUER,
  MCP_OAUTH_INTROSPECTION_URL,
  MCP_OAUTH_INTERNAL_ISSUER_URL,
  MCP_OAUTH_JWKS_URL,
  MCP_OAUTH_PUBLIC_ISSUER_URL,
  MCP_OAUTH_VALIDATION_METHOD,
  MCP_AUTH_MODE,
  type AuthMode,
  type OAuthValidationMethod,
} from './config.js';

export interface AuthContext {
  mode: AuthMode;
  middleware: RequestHandler | null;
  oauthMetadata?: OAuthMetadata;
  validationMethod?: 'introspection' | 'jwt';
}

export interface AuthOptions {
  enableOauth?: boolean;
  enableBearer?: boolean;
  port?: number;
}

interface TokenVerifierResult {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt?: number;
}

interface TokenVerifier {
  verifyAccessToken: (token: string) => Promise<TokenVerifierResult>;
}

/**
 * Determines the auth mode based on CLI flags and env var fallback.
 * CLI flags take precedence over MCP_AUTH_MODE env var.
 */
export const resolveAuthMode = (options: AuthOptions): AuthMode => {
  // CLI flags take precedence
  if (options.enableOauth) {
    return 'oauth';
  }
  if (options.enableBearer) {
    return 'bearer';
  }
  // Fall back to env var
  return MCP_AUTH_MODE;
};

const ensureTrailingSlash = (issuer: URL): URL => {
  if (issuer.href.endsWith('/')) {
    return issuer;
  }
  const withSlash = new URL(issuer.href);
  withSlash.pathname = withSlash.pathname.endsWith('/') ? withSlash.pathname : `${withSlash.pathname}/`;
  return withSlash;
};

const buildWellKnownCandidates = (issuer: URL): URL[] => {
  const issuerWithSlash = ensureTrailingSlash(issuer);
  const scoped = ['.well-known/openid-configuration', '.well-known/oauth-authorization-server'].map(
    (path) => new URL(`${issuerWithSlash.href}${path}`)
  );
  const root = [
    new URL('/.well-known/openid-configuration', issuer),
    new URL('/.well-known/oauth-authorization-server', issuer),
  ];
  return [...scoped, ...root];
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const discoverOAuthMetadata = async (issuer: URL): Promise<OAuthMetadata> => {
  const attempts: string[] = [];

  for (let attempt = 1; attempt <= MCP_OAUTH_DISCOVERY_RETRIES; attempt++) {
    for (const candidate of buildWellKnownCandidates(issuer)) {
      try {
        const response = await fetch(candidate);
        if (!response.ok) {
          console.error(
            `OAuth metadata fetch failed: ${candidate.href} (HTTP ${response.status} ${response.statusText})`
          );
          attempts.push(`${candidate.href} (HTTP ${response.status})`);
          continue;
        }
        const json = (await response.json()) as OAuthMetadata;
        return json;
      } catch (error) {
        console.error(`OAuth metadata fetch error: ${candidate.href} (${String(error)})`);
        attempts.push(`${candidate.href} (${String(error)})`);
      }
    }

    if (attempt < MCP_OAUTH_DISCOVERY_RETRIES) {
      console.error(`OAuth metadata discovery retry ${attempt}/${MCP_OAUTH_DISCOVERY_RETRIES}, issuer: ${issuer.href}`);
      await sleep(MCP_OAUTH_DISCOVERY_RETRY_DELAY_MS);
    }
  }

  throw new Error(`Unable to load OAuth metadata from issuer ${issuer.href}. Tried: ${attempts.join('; ')}`);
};

const audienceMatches = (aud: unknown, expected: string | undefined): boolean => {
  if (expected === undefined || expected === '') {
    return true;
  }

  if (typeof aud === 'string') {
    return aud === expected;
  }

  if (Array.isArray(aud)) {
    return aud.some((item) => audienceMatches(item, expected));
  }

  return false;
};

const rewriteOAuthMetadataIssuer = (metadata: OAuthMetadata, publicIssuer: string | undefined): OAuthMetadata => {
  if (publicIssuer === undefined || publicIssuer === '') {
    return metadata;
  }

  try {
    const issuerUrl = ensureTrailingSlash(new URL(publicIssuer));
    const remap = (value: unknown): string | undefined => {
      if (typeof value !== 'string' || value === '') {
        return undefined;
      }
      const original = new URL(value);
      const rewritten = new URL(original.pathname, issuerUrl);
      rewritten.search = original.search;
      rewritten.hash = original.hash;
      return rewritten.href;
    };

    return {
      ...metadata,
      issuer: issuerUrl.href,
      authorization_endpoint: remap(metadata.authorization_endpoint) ?? metadata.authorization_endpoint,
      token_endpoint: remap(metadata.token_endpoint) ?? metadata.token_endpoint,
      introspection_endpoint: remap(metadata.introspection_endpoint) ?? metadata.introspection_endpoint,
      userinfo_endpoint: remap(metadata.userinfo_endpoint) ?? metadata.userinfo_endpoint,
      revocation_endpoint:
        remap((metadata as Record<string, unknown>).revocation_endpoint) ??
        (metadata as Record<string, string | undefined>).revocation_endpoint,
      end_session_endpoint:
        remap((metadata as Record<string, unknown>).end_session_endpoint) ??
        (metadata as Record<string, string | undefined>).end_session_endpoint,
      jwks_uri: remap(metadata.jwks_uri) ?? metadata.jwks_uri,
    };
  } catch (error) {
    console.error(`Failed to rewrite OAuth metadata issuer, using discovered metadata: ${String(error)}`);
    return metadata;
  }
};

const buildBearerAuthContext = (): AuthContext => {
  const token = MCP_BEARER_TOKEN;
  if (token === undefined || token === '') {
    throw new Error('MCP_BEARER_TOKEN (or BEARER_TOKEN) is required when auth mode is bearer.');
  }

  const middleware = requireBearerAuth({
    verifier: {
      verifyAccessToken: async (accessToken: string) => {
        if (accessToken !== token) {
          throw new InvalidTokenError('Invalid token');
        }
        return {
          token: accessToken,
          clientId: 'local-user',
          scopes: ['mcp:tools'],
          expiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        };
      },
    },
    requiredScopes: [],
  });

  return { mode: 'bearer', middleware };
};

/**
 * Determines which validation method to use based on config and available metadata.
 *
 * @param method - Configured validation method ('auto', 'introspection', 'jwt')
 * @param hasClientCredentials - Whether client ID and secret are configured
 * @param hasIntrospectionEndpoint - Whether introspection endpoint is available
 * @param hasJwksUri - Whether JWKS URI is available
 * @returns The resolved validation method ('introspection' or 'jwt')
 */
const resolveValidationMethod = (
  method: OAuthValidationMethod,
  hasClientCredentials: boolean,
  hasIntrospectionEndpoint: boolean,
  hasJwksUri: boolean
): 'introspection' | 'jwt' => {
  if (method === 'introspection') {
    if (!hasClientCredentials) {
      throw new Error('MCP_OAUTH_CLIENT_ID and MCP_OAUTH_CLIENT_SECRET are required for introspection validation.');
    }
    if (!hasIntrospectionEndpoint) {
      throw new Error('Introspection endpoint not available. Set MCP_OAUTH_INTROSPECTION_URL or use jwt validation.');
    }
    return 'introspection';
  }

  if (method === 'jwt') {
    if (!hasJwksUri) {
      throw new Error('JWKS URI not available. Set MCP_OAUTH_JWKS_URL or ensure issuer metadata includes jwks_uri.');
    }
    return 'jwt';
  }

  // Auto mode: prefer introspection if credentials provided, otherwise use JWT
  if (hasClientCredentials && hasIntrospectionEndpoint) {
    return 'introspection';
  }

  if (hasJwksUri) {
    return 'jwt';
  }

  if (hasClientCredentials) {
    throw new Error(
      'OAuth auto-detection failed: client credentials provided but no introspection endpoint available. ' +
        'Set MCP_OAUTH_INTROSPECTION_URL or use MCP_OAUTH_VALIDATION_METHOD=jwt with JWKS.'
    );
  }

  throw new Error(
    'OAuth auto-detection failed: no client credentials and no JWKS URI available. ' +
      'Configure either client credentials for introspection or ensure jwks_uri is in issuer metadata.'
  );
};

/**
 * Creates a JWT verifier using JWKS for signature validation.
 */
const buildJwtVerifier = (
  jwksUrl: URL,
  expectedIssuer: string,
  expectedAudience: string | undefined
): TokenVerifier => {
  const JWKS = createRemoteJWKSet(jwksUrl);

  return {
    verifyAccessToken: async (token: string) => {
      try {
        const { payload } = await jwtVerify(token, JWKS, {
          issuer: expectedIssuer,
          audience: expectedAudience,
        });

        // Extract standard claims
        const clientId = extractClientId(payload);
        const scopes = extractScopes(payload);

        return {
          token,
          clientId,
          scopes,
          expiresAt: payload.exp,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        // Provide specific error messages for common JWT errors
        if (message.includes('expired')) {
          console.error('JWT validation failed: token has expired');
          throw new InvalidTokenError('Token has expired');
        }
        if (message.includes('audience')) {
          console.error(`JWT validation failed: audience mismatch (expected: ${expectedAudience})`);
          throw new InvalidTokenError('Token audience does not match');
        }
        if (message.includes('issuer')) {
          console.error(`JWT validation failed: issuer mismatch (expected: ${expectedIssuer})`);
          throw new InvalidTokenError('Token issuer does not match');
        }
        if (message.includes('signature')) {
          console.error('JWT validation failed: invalid signature');
          throw new InvalidTokenError('Invalid token signature');
        }

        console.error(`JWT validation failed: ${message}`);
        throw new InvalidTokenError('Token validation failed');
      }
    },
  };
};

/**
 * Extracts client ID from JWT payload (handles various claim names).
 */
const extractClientId = (payload: JWTPayload): string => {
  // Try common client ID claim names
  const clientId =
    (payload as Record<string, unknown>).client_id ??
    (payload as Record<string, unknown>).azp ?? // Azure/Google use 'azp' for authorized party
    (payload as Record<string, unknown>).cid ?? // Some providers use 'cid'
    payload.sub; // Fall back to subject

  return typeof clientId === 'string' ? clientId : 'unknown-client';
};

/**
 * Extracts scopes from JWT payload (handles various claim names and formats).
 */
const extractScopes = (payload: JWTPayload): string[] => {
  const scopeClaim = (payload as Record<string, unknown>).scope ?? (payload as Record<string, unknown>).scp;

  if (typeof scopeClaim === 'string') {
    return scopeClaim.split(' ').filter(Boolean);
  }

  if (Array.isArray(scopeClaim)) {
    return scopeClaim.filter((s): s is string => typeof s === 'string');
  }

  return [];
};

/**
 * Creates an introspection-based token verifier.
 */
const buildIntrospectionVerifier = (
  introspectionEndpoint: string,
  clientId: string,
  clientSecret: string,
  mcpPublicUrl: URL
): TokenVerifier => {
  return {
    verifyAccessToken: async (token: string) => {
      try {
        const response = await fetch(introspectionEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
          body: new URLSearchParams({
            token,
            token_type_hint: 'access_token',
            resource: mcpPublicUrl.href,
          }).toString(),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          console.error(`Token introspection HTTP error: ${response.status} ${response.statusText} - ${text}`);
          throw new InvalidTokenError(`Token introspection failed: HTTP ${response.status}`);
        }

        const data = (await response.json()) as Record<string, unknown>;

        if (data.active !== true) {
          console.error('Token introspection returned inactive token');
          throw new InvalidTokenError('Token is not active');
        }

        if (!audienceMatches(data.aud, MCP_OAUTH_AUDIENCE)) {
          console.error(`Token audience mismatch: got ${JSON.stringify(data.aud)}, expected ${MCP_OAUTH_AUDIENCE}`);
          throw new InvalidTokenError('Token audience does not match MCP_OAUTH_AUDIENCE');
        }

        return {
          token,
          clientId: typeof data.client_id === 'string' ? data.client_id : clientId,
          scopes: typeof data.scope === 'string' ? data.scope.split(' ') : [],
          expiresAt: typeof data.exp === 'number' ? data.exp : undefined,
        };
      } catch (error) {
        console.error(`Token introspection exception: ${String(error)}`);
        if (error instanceof InvalidTokenError) {
          throw error;
        }
        throw new InvalidTokenError('Token introspection failed');
      }
    },
  };
};

const buildOAuthAuthContext = async (mcpPublicUrl: URL): Promise<AuthContext> => {
  const internalIssuerString = MCP_OAUTH_INTERNAL_ISSUER_URL;
  if (internalIssuerString === undefined || internalIssuerString === '') {
    throw new Error('MCP_OAUTH_INTERNAL_ISSUER_URL (or MCP_OAUTH_ISSUER_URL) is required when auth mode is oauth.');
  }

  const issuer = new URL(internalIssuerString);
  const discoveredMetadata = await discoverOAuthMetadata(issuer);
  const oauthMetadata = rewriteOAuthMetadataIssuer(discoveredMetadata, MCP_OAUTH_PUBLIC_ISSUER_URL);

  // Determine available endpoints and credentials
  const introspectionEndpoint = MCP_OAUTH_INTROSPECTION_URL ?? discoveredMetadata.introspection_endpoint;
  const jwksUri = MCP_OAUTH_JWKS_URL ?? discoveredMetadata.jwks_uri;
  const hasClientCredentials =
    MCP_OAUTH_CLIENT_ID !== undefined &&
    MCP_OAUTH_CLIENT_ID !== '' &&
    MCP_OAUTH_CLIENT_SECRET !== undefined &&
    MCP_OAUTH_CLIENT_SECRET !== '';
  const hasIntrospectionEndpoint = introspectionEndpoint !== undefined && introspectionEndpoint !== '';
  const hasJwksUri = jwksUri !== undefined && jwksUri !== '';

  // Resolve which validation method to use
  const validationMethod = resolveValidationMethod(
    MCP_OAUTH_VALIDATION_METHOD,
    hasClientCredentials,
    hasIntrospectionEndpoint,
    hasJwksUri
  );

  console.error(`OAuth validation method: ${validationMethod}`);

  let verifier;

  if (validationMethod === 'jwt') {
    // JWT validation via JWKS
    const jwksUrl = new URL(jwksUri as string);
    // Prefer public issuer URL for JWT validation since tokens are typically signed with the public URL.
    // Fall back to discovered/internal issuer if no public URL is configured.
    const expectedIssuer =
      MCP_OAUTH_EXPECTED_ISSUER ?? MCP_OAUTH_PUBLIC_ISSUER_URL ?? discoveredMetadata.issuer ?? internalIssuerString;
    console.error(`JWT validation: JWKS URL: ${jwksUrl.href}, Expected issuer: ${expectedIssuer}`);
    verifier = buildJwtVerifier(jwksUrl, expectedIssuer, MCP_OAUTH_AUDIENCE);
  } else {
    // Token introspection
    console.error(`Token introspection: endpoint: ${introspectionEndpoint}`);
    verifier = buildIntrospectionVerifier(
      introspectionEndpoint!,
      MCP_OAUTH_CLIENT_ID!,
      MCP_OAUTH_CLIENT_SECRET!,
      mcpPublicUrl
    );
  }

  const middleware = requireBearerAuth({
    verifier,
    requiredScopes: [],
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpPublicUrl),
  });

  return { mode: 'oauth', middleware, oauthMetadata, validationMethod };
};

/**
 * Builds the authentication context based on CLI options and environment variables.
 * CLI flags take precedence over MCP_AUTH_MODE env var.
 *
 * @param options - Auth options from CLI flags
 * @param port - Server port (used for MCP_PUBLIC_URL fallback)
 * @returns AuthContext with mode, middleware, and optional OAuth metadata
 */
export const buildAuthContext = async (options: AuthOptions = {}): Promise<AuthContext> => {
  const mode = resolveAuthMode(options);
  const port = options.port ?? 3000;
  // Use process.env directly to detect if MCP_PUBLIC_URL was explicitly set.
  // MCP_PUBLIC_URL from config always has a default value, so we can't use it for the null check.
  const mcpPublicUrlString = process.env.MCP_PUBLIC_URL ?? `http://localhost:${port}/mcp`;
  const mcpPublicUrl = new URL(mcpPublicUrlString);

  switch (mode) {
    case 'none':
      console.error('MCP authentication disabled (auth mode: none)');
      return { mode, middleware: null };

    case 'bearer':
      return buildBearerAuthContext();

    case 'oauth':
      return buildOAuthAuthContext(mcpPublicUrl);

    default:
      console.error(`Unknown auth mode: ${mode}, defaulting to none`);
      return { mode: 'none', middleware: null };
  }
};
