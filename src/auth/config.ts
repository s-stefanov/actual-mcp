/**
 * Authentication configuration for MCP server.
 *
 * Supports three auth modes: none, bearer, oauth
 * Configuration can come from CLI flags (precedence) or MCP_AUTH_MODE env var.
 */

export type AuthMode = 'none' | 'bearer' | 'oauth';
export type OAuthValidationMethod = 'introspection' | 'jwt' | 'auto';

const parseIntEnv = (value: string | undefined, defaultValue: number): number => {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const parseStringEnv = (value: string | undefined): string | undefined => {
  return value !== undefined && value !== '' ? value : undefined;
};

// Port configuration
const MCP_PORT_ENV = process.env.MCP_PORT;
export const MCP_PORT = parseIntEnv(MCP_PORT_ENV, 3000);

// Public URL for OAuth resource metadata
const MCP_PUBLIC_URL_ENV = process.env.MCP_PUBLIC_URL;
export const MCP_PUBLIC_URL =
  MCP_PUBLIC_URL_ENV !== undefined && MCP_PUBLIC_URL_ENV !== ''
    ? MCP_PUBLIC_URL_ENV
    : `http://localhost:${MCP_PORT}/mcp`;

// Bearer token (used in bearer mode)
export const MCP_BEARER_TOKEN = parseStringEnv(process.env.MCP_BEARER_TOKEN ?? process.env.BEARER_TOKEN);

// Auth mode from env var (CLI flags take precedence when used)
export const MCP_AUTH_MODE = (process.env.MCP_AUTH_MODE ?? 'none').toLowerCase() as AuthMode;

// OAuth configuration
export const MCP_OAUTH_ISSUER_URL = parseStringEnv(process.env.MCP_OAUTH_ISSUER_URL);
export const MCP_OAUTH_INTERNAL_ISSUER_URL = parseStringEnv(
  process.env.MCP_OAUTH_INTERNAL_ISSUER_URL ?? MCP_OAUTH_ISSUER_URL
);
export const MCP_OAUTH_PUBLIC_ISSUER_URL = parseStringEnv(
  process.env.MCP_OAUTH_PUBLIC_ISSUER_URL ?? MCP_OAUTH_ISSUER_URL
);
export const MCP_OAUTH_CLIENT_ID = parseStringEnv(process.env.MCP_OAUTH_CLIENT_ID);
export const MCP_OAUTH_CLIENT_SECRET = parseStringEnv(process.env.MCP_OAUTH_CLIENT_SECRET);
export const MCP_OAUTH_INTROSPECTION_URL = parseStringEnv(process.env.MCP_OAUTH_INTROSPECTION_URL);
export const MCP_OAUTH_AUDIENCE = parseStringEnv(process.env.MCP_OAUTH_AUDIENCE);

// OAuth validation method: 'introspection' | 'jwt' | 'auto' (default: 'auto')
// - 'auto': Use introspection if client credentials provided, otherwise use JWT validation
// - 'introspection': Force token introspection (requires client ID and secret)
// - 'jwt': Force JWT validation via JWKS (no client credentials needed)
const parseValidationMethod = (value: string | undefined): OAuthValidationMethod => {
  const normalized = (value ?? 'auto').toLowerCase();
  if (normalized === 'introspection' || normalized === 'jwt' || normalized === 'auto') {
    return normalized;
  }
  return 'auto';
};
export const MCP_OAUTH_VALIDATION_METHOD = parseValidationMethod(process.env.MCP_OAUTH_VALIDATION_METHOD);

// JWKS URL for JWT validation (optional, auto-discovered from issuer metadata)
export const MCP_OAUTH_JWKS_URL = parseStringEnv(process.env.MCP_OAUTH_JWKS_URL);

// Expected issuer for JWT validation (optional, defaults to internal issuer URL)
export const MCP_OAUTH_EXPECTED_ISSUER = parseStringEnv(process.env.MCP_OAUTH_EXPECTED_ISSUER);

// OAuth discovery retry settings
export const MCP_OAUTH_DISCOVERY_RETRIES = parseIntEnv(process.env.MCP_OAUTH_DISCOVERY_RETRIES, 30);
export const MCP_OAUTH_DISCOVERY_RETRY_DELAY_MS = parseIntEnv(process.env.MCP_OAUTH_DISCOVERY_RETRY_DELAY_MS, 2000);
