import { describe, expect, it } from 'vitest';
import { isValidBearerToken } from './bearer-auth.js';

describe('isValidBearerToken', () => {
  it('returns true for a matching token', () => {
    expect(isValidBearerToken('secret-token', 'secret-token')).toBe(true);
  });

  it('returns false for a mismatched token of the same length', () => {
    expect(isValidBearerToken('secret-tokem', 'secret-token')).toBe(false);
  });

  it('returns false for a token of different length', () => {
    expect(isValidBearerToken('short', 'a-much-longer-token')).toBe(false);
  });

  it('returns false when no token is provided', () => {
    expect(isValidBearerToken(undefined, 'secret-token')).toBe(false);
  });

  it('returns false when the expected token is not configured', () => {
    expect(isValidBearerToken('secret-token', undefined)).toBe(false);
  });

  it('returns false when both tokens are empty strings', () => {
    expect(isValidBearerToken('', '')).toBe(false);
  });
});
