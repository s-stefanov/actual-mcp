import { describe, it, expect } from 'vitest';
import { NetWorthInputParser } from './input-parser.js';

describe('NetWorthInputParser', () => {
  const parser = new NetWorthInputParser();

  it('defaults to a year of history including off-budget accounts', () => {
    // Reason: net worth is meaningless without off-budget assets and debts.
    expect(parser.parse({})).toEqual({ months: 12, includeOffBudget: true, includeClosed: false });
  });

  it('honours explicit overrides', () => {
    expect(parser.parse({ months: 6, includeOffBudget: false, includeClosed: true })).toEqual({
      months: 6,
      includeOffBudget: false,
      includeClosed: true,
    });
  });

  it('rejects a non-positive month count', () => {
    expect(() => parser.parse({ months: 0 })).toThrow('months must be a positive number');
  });
});
