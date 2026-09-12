import { describe, expect, it } from 'vitest';
import { BalanceHistoryInputParser } from './input-parser.js';

describe('BalanceHistoryInputParser', () => {
  const parser = new BalanceHistoryInputParser();

  it('defaults an all-account report to three on-budget months', () => {
    expect(parser.parse({})).toEqual({
      accountId: undefined,
      includeOffBudget: false,
      months: 3,
    });
  });

  it('rejects a non-positive month count', () => {
    expect(() => parser.parse({ months: 0 })).toThrow();
  });
});
