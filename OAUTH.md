# OAuth 2.0 Configuration Guide

This guide covers OAuth 2.0 authentication setup for the Actual MCP server, including provider-specific configurations for Google, Azure AD, Keycloak, Auth0, and Okta.

## Overview

The MCP server supports two OAuth token validation methods:

| Method | Description | When to Use |
|--------|-------------|-------------|
| **Token Introspection** | Server-side validation via OAuth introspection endpoint (RFC 7662) | Keycloak, Auth0, Okta, or any provider with introspection support |
| **JWT Validation** | Client-side validation using JWKS (JSON Web Key Set) | Azure AD or providers that issue JWT access tokens |

### Automatic Detection

By default (`MCP_OAUTH_VALIDATION_METHOD=auto`), the server automatically selects:

1. **Introspection** if client credentials (`MCP_OAUTH_CLIENT_ID` and `MCP_OAUTH_CLIENT_SECRET`) are provided
2. **JWT validation** if no credentials are provided but JWKS URI is available in the issuer metadata

## Environment Variables Reference

### Required for All OAuth Configurations

| Variable | Description |
|----------|-------------|
| `MCP_OAUTH_ISSUER_URL` | OAuth issuer URL (OpenID Connect discovery base) |

### For Token Introspection

| Variable | Description |
|----------|-------------|
| `MCP_OAUTH_CLIENT_ID` | Client ID for introspection requests |
| `MCP_OAUTH_CLIENT_SECRET` | Client secret for introspection requests |
| `MCP_OAUTH_INTROSPECTION_URL` | Optional: Override discovered introspection endpoint |

### For JWT Validation

| Variable | Description |
|----------|-------------|
| `MCP_OAUTH_JWKS_URL` | Optional: Override discovered JWKS URI |
| `MCP_OAUTH_EXPECTED_ISSUER` | Optional: Override expected issuer in JWT |
| `MCP_OAUTH_AUDIENCE` | Expected audience claim in JWT |

### Validation Method Control

| Variable | Values | Description |
|----------|--------|-------------|
| `MCP_OAUTH_VALIDATION_METHOD` | `auto`, `introspection`, `jwt` | Force a specific validation method |

### Advanced Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_OAUTH_INTERNAL_ISSUER_URL` | - | Issuer URL for internal network (in case you are using Docker/reverse proxy) |
| `MCP_OAUTH_PUBLIC_ISSUER_URL` | - | Issuer URL exposed to clients (should be set if you are using the internal issuer url, so clients can connect directly)|
| `MCP_PUBLIC_URL` | - | Public URL of the MCP server |
| `MCP_OAUTH_DISCOVERY_RETRIES` | 30 | Retry attempts for metadata discovery (useful if you start keycloak and the mcp server at the same time, and keycloak isn't ready right away) |
| `MCP_OAUTH_DISCOVERY_RETRY_DELAY_MS` | 2000 | Delay between discovery retries |

---

## Provider-Specific Configurations

### Google OAuth (Not Supported)

> **Google OAuth is not currently supported.** This section explains why and potential future solutions.

Google's OAuth implementation is incompatible with this MCP server because:

1. **Opaque Access Tokens**: Google issues opaque access tokens (e.g., `ya29.a0AfH6SMBx...`) rather than JWTs. These cannot be validated using JWKS because they don't have the standard JWT `header.payload.signature` structure.

2. **No Standard Introspection**: Google does not provide an RFC 7662-compliant token introspection endpoint. Their `tokeninfo` endpoint uses a different format.

3. **ID Tokens vs Access Tokens**: While Google does issue JWT ID tokens, these are meant for authentication (proving identity), not authorization (access to resources). Using ID tokens as access tokens is not recommended.

**Potential Future Solutions:**

- **Userinfo Endpoint Validation**: Validate tokens by calling Google's userinfo endpoint. If the call succeeds, the token is valid.
- **TokenInfo Endpoint**: Add support for Google's proprietary tokeninfo endpoint format.
- **ID Token Mode**: Support using ID tokens instead of access tokens (requires different OAuth flow).

If you need Google OAuth support, please open an issue on the repository.

---

### Azure AD / Microsoft Entra ID

Azure AD uses JWT validation via JWKS.

**Setup Steps:**

1. Register an application in [Azure Portal](https://portal.azure.com/)
2. Navigate to App registrations → New registration
3. Configure API permissions and expose an API if needed
4. Note your Application (client) ID and Directory (tenant) ID

**Environment Configuration:**

```bash
# For single-tenant apps
export MCP_OAUTH_ISSUER_URL="https://login.microsoftonline.com/{tenant-id}/v2.0"
export MCP_OAUTH_AUDIENCE="api://YOUR_APP_ID"

# For multi-tenant apps
export MCP_OAUTH_ISSUER_URL="https://login.microsoftonline.com/common/v2.0"
export MCP_OAUTH_AUDIENCE="api://YOUR_APP_ID"

# Optional
export MCP_OAUTH_VALIDATION_METHOD="jwt"
```

**Notes:**
- Replace `{tenant-id}` with your Azure AD tenant ID
- The audience is typically `api://` followed by your application ID
- For multi-tenant apps, use `/common/` in the issuer URL

---

### Keycloak

Keycloak supports both token introspection and JWT validation.

**Token Introspection (Recommended):**

1. Create a realm in Keycloak Admin Console
2. Create a client with "Client authentication" enabled (confidential client)
3. Note the client ID and secret from the Credentials tab

```bash
export MCP_OAUTH_ISSUER_URL="https://keycloak.example.com/realms/YOUR_REALM"
export MCP_OAUTH_CLIENT_ID="mcp-server"
export MCP_OAUTH_CLIENT_SECRET="your-client-secret"

# Optional: Force introspection (auto-detected with credentials)
export MCP_OAUTH_VALIDATION_METHOD="introspection"
```

**JWT Validation Alternative:**

```bash
export MCP_OAUTH_ISSUER_URL="https://keycloak.example.com/realms/YOUR_REALM"
export MCP_OAUTH_VALIDATION_METHOD="jwt"
export MCP_OAUTH_AUDIENCE="your-client-id"  # Optional
```

**Docker/Reverse Proxy Setup:**

When Keycloak and the MCP server run in Docker or behind a reverse proxy together, internal and external URLs may differ:

```bash
# Internal URL (reachable from MCP server)
export MCP_OAUTH_INTERNAL_ISSUER_URL="http://keycloak:8080/realms/YOUR_REALM"

# External URL (for client metadata)
export MCP_OAUTH_PUBLIC_ISSUER_URL="https://keycloak.example.com/realms/YOUR_REALM"

# Override introspection endpoint if metadata returns internal URL
export MCP_OAUTH_INTROSPECTION_URL="http://localhost:8080/realms/YOUR_REALM/protocol/openid-connect/token/introspect"
```

---

### Auth0

Auth0 supports both token introspection and JWT validation.

**JWT Validation (Simpler):**

```bash
export MCP_OAUTH_ISSUER_URL="https://YOUR_DOMAIN.auth0.com/"
export MCP_OAUTH_AUDIENCE="YOUR_API_IDENTIFIER"
export MCP_OAUTH_VALIDATION_METHOD="jwt"
```

**Token Introspection:**

1. Create a Machine-to-Machine application in Auth0
2. Authorize it to call your API
3. Enable token introspection in your API settings

```bash
export MCP_OAUTH_ISSUER_URL="https://YOUR_DOMAIN.auth0.com/"
export MCP_OAUTH_CLIENT_ID="your-m2m-client-id"
export MCP_OAUTH_CLIENT_SECRET="your-m2m-client-secret"
export MCP_OAUTH_AUDIENCE="YOUR_API_IDENTIFIER"
```

**Notes:**
- Auth0 issues URL must include the trailing slash
- The audience is your API identifier (not the client ID)

---

### Okta

Okta supports both token introspection and JWT validation.

**Token Introspection:**

1. Create an application in Okta Admin Console
2. For introspection, create a "Web" application type
3. Note the client ID and secret

```bash
export MCP_OAUTH_ISSUER_URL="https://YOUR_DOMAIN.okta.com/oauth2/default"
export MCP_OAUTH_CLIENT_ID="your-client-id"
export MCP_OAUTH_CLIENT_SECRET="your-client-secret"
```

**JWT Validation:**

```bash
export MCP_OAUTH_ISSUER_URL="https://YOUR_DOMAIN.okta.com/oauth2/default"
export MCP_OAUTH_VALIDATION_METHOD="jwt"
export MCP_OAUTH_AUDIENCE="api://default"
```

**Custom Authorization Server:**

If using a custom authorization server instead of the default:

```bash
export MCP_OAUTH_ISSUER_URL="https://YOUR_DOMAIN.okta.com/oauth2/YOUR_AUTH_SERVER_ID"
```

---

## Troubleshooting

### Common Issues

**"Unable to load OAuth metadata from issuer"**
- Verify the issuer URL is correct and accessible
- Check if the `.well-known/openid-configuration` endpoint is reachable
- Ensure no network/firewall issues between the MCP server and the OAuth provider
- Increase `MCP_OAUTH_DISCOVERY_RETRIES` if the provider is slow to start

**"JWKS URI not available"**
- The OAuth provider's metadata doesn't include a `jwks_uri`
- Set `MCP_OAUTH_JWKS_URL` manually
- Consider using introspection instead if your provider supports it

**"Token audience does not match"**
- The `aud` claim in the token doesn't match `MCP_OAUTH_AUDIENCE`
- Verify the audience value matches what your OAuth provider issues
- Some providers use the client ID as audience, others use an API identifier

**"Token issuer does not match"**
- The `iss` claim in the token doesn't match the expected issuer
- Set `MCP_OAUTH_EXPECTED_ISSUER` to override the expected value
- Check for trailing slash differences in issuer URLs

**Token introspection returns "Token is not active"**
- The token has expired
- The token was issued for a different audience/resource
- Client credentials don't have permission to introspect tokens

### Debugging Tips

1. **Check OAuth metadata discovery:**
   ```bash
   curl https://your-issuer/.well-known/openid-configuration | jq
   ```

2. **Verify JWKS endpoint:**
   ```bash
   curl https://your-issuer/path/to/jwks | jq
   ```

3. **Decode your JWT to inspect claims:**
   ```bash
   # Paste at https://jwt.io or use:
   echo "YOUR_TOKEN" | cut -d. -f2 | base64 -d | jq
   ```

4. **Test introspection manually:**
   ```bash
   curl -X POST https://your-issuer/introspect \
     -u "client_id:client_secret" \
     -d "token=YOUR_TOKEN"
   ```

### Logging

The MCP server logs OAuth-related information to stderr:
- Validation method selection
- JWKS URL and expected issuer for JWT validation
- Introspection endpoint for token introspection
- Token validation errors with specific reasons

Run the server and check stderr output for debugging information.

---

## Security Best Practices

1. **Use HTTPS** for all OAuth endpoints in production
2. **Rotate client secrets** regularly when using introspection
3. **Set appropriate token expiration** times in your OAuth provider
4. **Use the principle of least privilege** for scopes and permissions
5. **Validate the audience claim** to ensure tokens are intended for your API
