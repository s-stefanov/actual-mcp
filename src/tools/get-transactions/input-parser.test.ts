import { describe, it, expect } from 'vitest';
import { GetTransactionsInputParser } from './input-parser.js';

describe('GetTransactionsInputParser', () => {
  const parser = new GetTransactionsInputParser();

  it('parses a valid date range (happy path)', () => {
    const result = parser.parse({
      accountId: 'acct-1',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
    });

    expect(result.startDate).toBe('2024-01-01');
    expect(result.endDate).toBe('2024-03-31');
  });

  it('leaves dates undefined when not provided (edge case)', () => {
    const result = parser.parse({ accountId: 'acct-1' });

    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBeUndefined();
  });

  it('parses the uncategorized flag', () => {
    const result = parser.parse({ accountId: 'acct-1', uncategorized: true });

    expect(result.uncategorized).toBe(true);
  });

  it('rejects malformed dates (failure case)', () => {
    expect(() => parser.parse({ accountId: 'acct-1', startDate: '01/02/2024' })).toThrow(/YYYY-MM-DD/);
  });

  it('rejects an inverted date range', () => {
    expect(() => parser.parse({ accountId: 'acct-1', startDate: '2024-05-01', endDate: '2024-04-01' })).toThrow(
      /on or before/
    );
  });

  it('requires an accountId', () => {
    expect(() => parser.parse({ startDate: '2024-01-01' })).toThrow(/accountId/);
  });
});
