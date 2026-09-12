import { describe, it, expect } from 'vitest';
import { SpendingByPayeeInputParser } from './input-parser.js';

describe('SpendingByPayeeInputParser', () => {
  const parser = new SpendingByPayeeInputParser();

  it('defaults to twenty payees of spending', () => {
    expect(parser.parse({})).toMatchObject({ limit: 20, includeIncome: false });
  });

  it('keeps an explicit date range and account', () => {
    expect(parser.parse({ startDate: '2026-01-01', endDate: '2026-06-30', accountId: 'a1' })).toMatchObject({
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      accountId: 'a1',
    });
  });

  it('rejects a non-positive limit', () => {
    expect(() => parser.parse({ limit: 0 })).toThrow('limit must be a positive number');
  });
});
