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

      it('should throw error when OAuth client ID is not configured', async () => {
        mockConfig.MCP_OAUTH_INTERNAL_ISSUER_URL = 'http://localhost:8080/realms/test';
        mockConfig.MCP_OAUTH_CLIENT_ID = undefined;

        await expect(buildAuthContext({ enableOauth: true })).rejects.toThrow(
          'MCP_OAUTH_CLIENT_ID is required when auth mode is oauth'
        );
      });

      it('should throw error when OAuth client secret is not configured', async () => {
        mockConfig.MCP_OAUTH_INTERNAL_ISSUER_URL = 'http://localhost:8080/realms/test';
        mockConfig.MCP_OAUTH_CLIENT_ID = 'test-client';
        mockConfig.MCP_OAUTH_CLIENT_SECRET = undefined;

        await expect(buildAuthContext({ enableOauth: true })).rejects.toThrow(
          'MCP_OAUTH_CLIENT_SECRET is required when auth mode is oauth'
        );
      });
    });
  });
});
