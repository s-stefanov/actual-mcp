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

  it('parses categoryId and offset, ignoring non-positive paging values', () => {
    const result = new GetTransactionsInputParser().parse({ categoryId: 'groceries', offset: 40, limit: 0 });

    expect(result.categoryId).toBe('groceries');
    expect(result.offset).toBe(40);
    expect(result.limit).toBeUndefined();
  });

  it('parses the uncategorized and includePayeeHistory flags, ignoring non-boolean values', () => {
    const parser = new GetTransactionsInputParser();

    expect(parser.parse({ uncategorized: true, includePayeeHistory: true })).toMatchObject({
      uncategorized: true,
      includePayeeHistory: true,
    });
    expect(parser.parse({ uncategorized: 'yes' }).uncategorized).toBeUndefined();
  });

  it('rejects non-object arguments', () => {
    expect(() => new GetTransactionsInputParser().parse(null)).toThrow('Arguments must be an object');
  });
});
