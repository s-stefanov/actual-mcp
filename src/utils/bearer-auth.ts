import { timingSafeEqual } from 'node:crypto';

/**
 * Compares a submitted bearer token against the expected token in constant time.
 *
 * Uses `crypto.timingSafeEqual` to avoid leaking token information via timing
 * side-channels (CWE-208). The length check runs before `timingSafeEqual`
 * because it throws on buffers of unequal length.
 *
 * @param token - Token submitted by the client (undefined when no Authorization header is present)
 * @param expectedToken - Configured token from the BEARER_TOKEN environment variable
 * @returns true only if both tokens are present and match in constant time
 */
export function isValidBearerToken(token: string | undefined, expectedToken: string | undefined): boolean {
  if (!token || !expectedToken) {
    return false;
  }

  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedToken);

  // Reason: timingSafeEqual requires equal-length buffers and throws otherwise,
  // so lengths are compared first to reject mismatches safely.
  if (tokenBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenBuffer, expectedBuffer);
}
