import { describe, expect, it } from 'vitest';
import { GetTransactionsInputParser } from './input-parser.js';

describe('GetTransactionsInputParser', () => {
  it('parses accountId when provided', () => {
    const result = new GetTransactionsInputParser().parse({ accountId: 'checking', payeeName: 'Amazon' });

    expect(result.accountId).toBe('checking');
    expect(result.payeeName).toBe('Amazon');
  });

  it('parses without accountId, leaving it undefined for a cross-account search', () => {
    const result = new GetTransactionsInputParser().parse({ payeeName: 'Amazon' });

    expect(result.accountId).toBeUndefined();
    expect(result.payeeName).toBe('Amazon');
  });

  it('rejects non-object arguments', () => {
    expect(() => new GetTransactionsInputParser().parse(null)).toThrow('Arguments must be an object');
  });
});
