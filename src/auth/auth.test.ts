import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config module with dynamic values
const mockConfig = {
  MCP_AUTH_MODE: 'none' as 'none' | 'bearer' | 'oauth',
  MCP_BEARER_TOKEN: undefined as string | undefined,
  MCP_PUBLIC_URL: 'http://localhost:3000/mcp',
  MCP_OAUTH_INTERNAL_ISSUER_URL: undefined as string | undefined,
  MCP_OAUTH_PUBLIC_ISSUER_URL: undefined as string | undefined,
  MCP_OAUTH_CLIENT_ID: undefined as string | undefined,
  MCP_OAUTH_CLIENT_SECRET: undefined as string | undefined,
  MCP_OAUTH_INTROSPECTION_URL: undefined as string | undefined,
  MCP_OAUTH_AUDIENCE: undefined as string | undefined,
  MCP_OAUTH_VALIDATION_METHOD: 'auto' as 'introspection' | 'jwt' | 'auto',
  MCP_OAUTH_JWKS_URL: undefined as string | undefined,
  MCP_OAUTH_EXPECTED_ISSUER: undefined as string | undefined,
  MCP_OAUTH_DISCOVERY_RETRIES: 1,
  MCP_OAUTH_DISCOVERY_RETRY_DELAY_MS: 100,
};

vi.mock('./config.js', () => ({
  get MCP_AUTH_MODE() {
    return mockConfig.MCP_AUTH_MODE;
  },
  get MCP_BEARER_TOKEN() {
    return mockConfig.MCP_BEARER_TOKEN;
  },
  get MCP_PUBLIC_URL() {
    return mockConfig.MCP_PUBLIC_URL;
  },
  get MCP_OAUTH_INTERNAL_ISSUER_URL() {
    return mockConfig.MCP_OAUTH_INTERNAL_ISSUER_URL;
  },
  get MCP_OAUTH_PUBLIC_ISSUER_URL() {
    return mockConfig.MCP_OAUTH_PUBLIC_ISSUER_URL;
  },
  get MCP_OAUTH_CLIENT_ID() {
    return mockConfig.MCP_OAUTH_CLIENT_ID;
  },
  get MCP_OAUTH_CLIENT_SECRET() {
    return mockConfig.MCP_OAUTH_CLIENT_SECRET;
  },
  get MCP_OAUTH_INTROSPECTION_URL() {
    return mockConfig.MCP_OAUTH_INTROSPECTION_URL;
  },
  get MCP_OAUTH_AUDIENCE() {
    return mockConfig.MCP_OAUTH_AUDIENCE;
  },
  get MCP_OAUTH_VALIDATION_METHOD() {
    return mockConfig.MCP_OAUTH_VALIDATION_METHOD;
  },
  get MCP_OAUTH_JWKS_URL() {
    return mockConfig.MCP_OAUTH_JWKS_URL;
  },
  get MCP_OAUTH_EXPECTED_ISSUER() {
    return mockConfig.MCP_OAUTH_EXPECTED_ISSUER;
  },
  get MCP_OAUTH_DISCOVERY_RETRIES() {
    return mockConfig.MCP_OAUTH_DISCOVERY_RETRIES;
  },
  get MCP_OAUTH_DISCOVERY_RETRY_DELAY_MS() {
    return mockConfig.MCP_OAUTH_DISCOVERY_RETRY_DELAY_MS;
  },
}));

// Mock the SDK auth modules
vi.mock('@modelcontextprotocol/sdk/server/auth/errors.js', () => ({
  InvalidTokenError: class InvalidTokenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'InvalidTokenError';
    }
  },
}));

vi.mock('@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js', () => ({
  requireBearerAuth: vi.fn(() => vi.fn()),
}));

vi.mock('@modelcontextprotocol/sdk/server/auth/router.js', () => ({
  getOAuthProtectedResourceMetadataUrl: vi.fn(() => 'http://localhost:3000/.well-known/oauth-protected-resource'),
}));

// Mock jose for JWT validation
vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => vi.fn()),
  jwtVerify: vi.fn(),
}));

// Import after mocks are set up
import { resolveAuthMode, buildAuthContext, type AuthOptions } from './auth.js';

describe('auth module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock config to defaults
    mockConfig.MCP_AUTH_MODE = 'none';
    mockConfig.MCP_BEARER_TOKEN = undefined;
    mockConfig.MCP_OAUTH_INTERNAL_ISSUER_URL = undefined;
    mockConfig.MCP_OAUTH_PUBLIC_ISSUER_URL = undefined;
    mockConfig.MCP_OAUTH_CLIENT_ID = undefined;
    mockConfig.MCP_OAUTH_CLIENT_SECRET = undefined;
    mockConfig.MCP_OAUTH_INTROSPECTION_URL = undefined;
    mockConfig.MCP_OAUTH_AUDIENCE = undefined;
    mockConfig.MCP_OAUTH_VALIDATION_METHOD = 'auto';
    mockConfig.MCP_OAUTH_JWKS_URL = undefined;
    mockConfig.MCP_OAUTH_EXPECTED_ISSUER = undefined;
  });

  describe('resolveAuthMode', () => {
    it('should return oauth when enableOauth is true', () => {
      const options: AuthOptions = { enableOauth: true, enableBearer: false };
      expect(resolveAuthMode(options)).toBe('oauth');
    });

    it('should return oauth when both enableOauth and enableBearer are true (oauth takes precedence)', () => {
      const options: AuthOptions = { enableOauth: true, enableBearer: true };
      expect(resolveAuthMode(options)).toBe('oauth');
    });

    it('should return bearer when only enableBearer is true', () => {
      const options: AuthOptions = { enableOauth: false, enableBearer: true };
      expect(resolveAuthMode(options)).toBe('bearer');
    });

    it('should fall back to MCP_AUTH_MODE when no CLI flags are set', () => {
      mockConfig.MCP_AUTH_MODE = 'bearer';
      const options: AuthOptions = { enableOauth: false, enableBearer: false };
      expect(resolveAuthMode(options)).toBe('bearer');
    });

    it('should return none when no flags and MCP_AUTH_MODE is none', () => {
      mockConfig.MCP_AUTH_MODE = 'none';
      const options: AuthOptions = {};
      expect(resolveAuthMode(options)).toBe('none');
    });

    it('should default to none when no flags set', () => {
      mockConfig.MCP_AUTH_MODE = 'none';
      const options: AuthOptions = {};
      expect(resolveAuthMode(options)).toBe('none');
    });
  });

  describe('buildAuthContext', () => {
    describe('none mode', () => {
      it('should return null middleware when auth mode is none', async () => {
        mockConfig.MCP_AUTH_MODE = 'none';
        const context = await buildAuthContext({ enableOauth: false, enableBearer: false });

        expect(context.mode).toBe('none');
        expect(context.middleware).toBeNull();
        expect(context.oauthMetadata).toBeUndefined();
      });
    });

    describe('bearer mode', () => {
      it('should return middleware when bearer token is configured', async () => {
        mockConfig.MCP_BEARER_TOKEN = 'test-token';

        const context = await buildAuthContext({ enableBearer: true });

        expect(context.mode).toBe('bearer');
        expect(context.middleware).toBeDefined();
        expect(context.middleware).not.toBeNull();
        expect(context.oauthMetadata).toBeUndefined();
      });

      it('should throw error when bearer token is not configured', async () => {
        mockConfig.MCP_BEARER_TOKEN = undefined;

        await expect(buildAuthContext({ enableBearer: true })).rejects.toThrow(
          'MCP_BEARER_TOKEN (or BEARER_TOKEN) is required when auth mode is bearer'
        );
      });
    });

    describe('oauth mode', () => {
      it('should throw error when OAuth issuer URL is not configured', async () => {
        mockConfig.MCP_OAUTH_INTERNAL_ISSUER_URL = undefined;

        await expect(buildAuthContext({ enableOauth: true })).rejects.toThrow(
          'MCP_OAUTH_INTERNAL_ISSUER_URL (or MCP_OAUTH_ISSUER_URL) is required when auth mode is oauth'
        );
      });

      describe('with mocked OAuth metadata', () => {
        const mockOAuthMetadata = {
          issuer: 'http://localhost:8080/realms/test',
          authorization_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/auth',
          token_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/token',
          introspection_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/token/introspect',
          jwks_uri: 'http://localhost:8080/realms/test/protocol/openid-connect/certs',
        };

        beforeEach(() => {
          // Mock successful OAuth metadata discovery
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockOAuthMetadata),
          });
        });

        it('should use introspection when client credentials are provided', async () => {
          mockConfig.MCP_OAUTH_INTERNAL_ISSUER_URL = 'http://localhost:8080/realms/test';
          mockConfig.MCP_OAUTH_CLIENT_ID = 'test-client';
          mockConfig.MCP_OAUTH_CLIENT_SECRET = 'test-secret';

          const context = await buildAuthContext({ enableOauth: true });

          expect(context.mode).toBe('oauth');
          expect(context.validationMethod).toBe('introspection');
          expect(context.middleware).toBeDefined();
          expect(context.oauthMetadata).toBeDefined();
        });

        it('should use JWT validation when only JWKS is available (no credentials)', async () => {
          mockConfig.MCP_OAUTH_INTERNAL_ISSUER_URL = 'http://localhost:8080/realms/test';
          // No client credentials - should fall back to JWT
          mockConfig.MCP_OAUTH_CLIENT_ID = undefined;
          mockConfig.MCP_OAUTH_CLIENT_SECRET = undefined;

          const context = await buildAuthContext({ enableOauth: true });

          expect(context.mode).toBe('oauth');
          expect(context.validationMethod).toBe('jwt');
          expect(context.middleware).toBeDefined();
        });

        it('should use JWT validation when MCP_OAUTH_VALIDATION_METHOD is set to jwt', async () => {
          mockConfig.MCP_OAUTH_INTERNAL_ISSUER_URL = 'http://localhost:8080/realms/test';
          mockConfig.MCP_OAUTH_VALIDATION_METHOD = 'jwt';

          const context = await buildAuthContext({ enableOauth: true });

          expect(context.mode).toBe('oauth');
          expect(context.validationMethod).toBe('jwt');
        });

        it('should use introspection when MCP_OAUTH_VALIDATION_METHOD is set to introspection', async () => {
          mockConfig.MCP_OAUTH_INTERNAL_ISSUER_URL = 'http://localhost:8080/realms/test';
          mockConfig.MCP_OAUTH_CLIENT_ID = 'test-client';
          mockConfig.MCP_OAUTH_CLIENT_SECRET = 'test-secret';
          mockConfig.MCP_OAUTH_VALIDATION_METHOD = 'introspection';

          const context = await buildAuthContext({ enableOauth: true });

          expect(context.mode).toBe('oauth');
          expect(context.validationMethod).toBe('introspection');
        });

        it('should throw error when introspection is forced but no credentials', async () => {
          mockConfig.MCP_OAUTH_INTERNAL_ISSUER_URL = 'http://localhost:8080/realms/test';
          mockConfig.MCP_OAUTH_VALIDATION_METHOD = 'introspection';
          mockConfig.MCP_OAUTH_CLIENT_ID = undefined;

          await expect(buildAuthContext({ enableOauth: true })).rejects.toThrow(
            'MCP_OAUTH_CLIENT_ID and MCP_OAUTH_CLIENT_SECRET are required for introspection validation'
          );
        });

        it('should throw error when JWT is forced but no JWKS URI', async () => {
          mockConfig.MCP_OAUTH_INTERNAL_ISSUER_URL = 'http://localhost:8080/realms/test';
          mockConfig.MCP_OAUTH_VALIDATION_METHOD = 'jwt';

          // Mock metadata without jwks_uri
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () =>
              Promise.resolve({
                issuer: 'http://localhost:8080/realms/test',
                authorization_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/auth',
                token_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/token',
              }),
          });

          await expect(buildAuthContext({ enableOauth: true })).rejects.toThrow(
            'JWKS URI not available. Set MCP_OAUTH_JWKS_URL or ensure issuer metadata includes jwks_uri'
          );
        });

        it('should use custom JWKS URL when provided', async () => {
          mockConfig.MCP_OAUTH_INTERNAL_ISSUER_URL = 'http://localhost:8080/realms/test';
          mockConfig.MCP_OAUTH_JWKS_URL = 'http://custom-jwks.example.com/certs';
          mockConfig.MCP_OAUTH_VALIDATION_METHOD = 'jwt';

          const context = await buildAuthContext({ enableOauth: true });

          expect(context.validationMethod).toBe('jwt');
        });
      });

      describe('with OAuth metadata discovery failure', () => {
        beforeEach(() => {
          // Mock failed OAuth metadata discovery
          global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          });
        });

        it('should throw error when OAuth metadata cannot be discovered', async () => {
          mockConfig.MCP_OAUTH_INTERNAL_ISSUER_URL = 'http://localhost:8080/realms/test';
          mockConfig.MCP_OAUTH_CLIENT_ID = 'test-client';
          mockConfig.MCP_OAUTH_CLIENT_SECRET = 'test-secret';

          await expect(buildAuthContext({ enableOauth: true })).rejects.toThrow(
            /Unable to load OAuth metadata from issuer/
          );
        });
      });
    });
  });
});
