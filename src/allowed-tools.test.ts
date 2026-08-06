import { describe, expect, it } from 'vitest';
import { resolveAllowedTools } from './allowed-tools.js';

describe('resolveAllowedTools', () => {
  it('uses the CLI value ahead of the environment value', () => {
    expect(resolveAllowedTools('get-accounts', 'get-transactions')).toEqual(['get-accounts']);
  });

  it('trims whitespace and removes duplicate names while preserving order', () => {
    expect(resolveAllowedTools(' get-accounts, get-transactions, get-accounts , ', undefined)).toEqual([
      'get-accounts',
      'get-transactions',
    ]);
  });

  it('returns undefined when neither setting is present for backward compatibility', () => {
    expect(resolveAllowedTools(undefined, undefined)).toBeUndefined();
  });

  it('treats an explicitly empty setting as an empty allowlist', () => {
    expect(resolveAllowedTools(undefined, '  , ')).toEqual([]);
  });
});
