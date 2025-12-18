/**
 * Authentication module for MCP server.
 *
 * Supports three modes:
 * - none: No authentication
 * - bearer: Static bearer token validation
 * - oauth: OAuth 2.0 with token introspection
 */
import { type RequestHandler } from 'express';
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
  MCP_OAUTH_INTROSPECTION_URL,
  MCP_OAUTH_INTERNAL_ISSUER_URL,
  MCP_OAUTH_PUBLIC_ISSUER_URL,
  MCP_PUBLIC_URL,
  MCP_AUTH_MODE,
  type AuthMode,
} from './config.js';

export interface AuthContext {
  mode: AuthMode;
  middleware: RequestHandler | null;
  oauthMetadata?: OAuthMetadata;
}

export interface AuthOptions {
  enableOauth?: boolean;
  enableBearer?: boolean;
  port?: number;
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

const buildOAuthAuthContext = async (mcpPublicUrl: URL): Promise<AuthContext> => {
  const internalIssuerString = MCP_OAUTH_INTERNAL_ISSUER_URL;
  if (internalIssuerString === undefined || internalIssuerString === '') {
    throw new Error('MCP_OAUTH_INTERNAL_ISSUER_URL (or MCP_OAUTH_ISSUER_URL) is required when auth mode is oauth.');
  }
  if (MCP_OAUTH_CLIENT_ID === undefined || MCP_OAUTH_CLIENT_ID === '') {
    throw new Error('MCP_OAUTH_CLIENT_ID is required when auth mode is oauth.');
  }
  if (MCP_OAUTH_CLIENT_SECRET === undefined || MCP_OAUTH_CLIENT_SECRET === '') {
    throw new Error('MCP_OAUTH_CLIENT_SECRET is required when auth mode is oauth.');
  }

  const issuer = new URL(internalIssuerString);
  const discoveredMetadata = await discoverOAuthMetadata(issuer);
  const introspectionEndpoint = MCP_OAUTH_INTROSPECTION_URL ?? discoveredMetadata.introspection_endpoint;
  const oauthMetadata = rewriteOAuthMetadataIssuer(discoveredMetadata, MCP_OAUTH_PUBLIC_ISSUER_URL);

  if (introspectionEndpoint === undefined || introspectionEndpoint === '') {
    throw new Error(
      'OAuth metadata is missing an introspection_endpoint. Set MCP_OAUTH_INTROSPECTION_URL to override.'
    );
  }

  const verifier = {
    verifyAccessToken: async (token: string) => {
      try {
        const response = await fetch(introspectionEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${MCP_OAUTH_CLIENT_ID}:${MCP_OAUTH_CLIENT_SECRET}`).toString('base64')}`,
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
          clientId: typeof data.client_id === 'string' ? data.client_id : (MCP_OAUTH_CLIENT_ID ?? 'unknown-client'),
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

  const middleware = requireBearerAuth({
    verifier,
    requiredScopes: [],
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpPublicUrl),
  });

  return { mode: 'oauth', middleware, oauthMetadata };
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
  const mcpPublicUrlString = process.env.MCP_PUBLIC_URL ?? MCP_PUBLIC_URL ?? `http://localhost:${port}/mcp`;
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
