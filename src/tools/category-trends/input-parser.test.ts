import { describe, it, expect } from 'vitest';
import { CategoryTrendsInputParser } from './input-parser.js';

describe('CategoryTrendsInputParser', () => {
  const parser = new CategoryTrendsInputParser();

  it('defaults to six months of expense categories', () => {
    expect(parser.parse({})).toMatchObject({ months: 6, includeIncome: false });
  });

  it('keeps category and group filters', () => {
    expect(parser.parse({ categoryNames: ['Groceries'], categoryGroupName: 'Food & Drink' })).toMatchObject({
      categoryNames: ['Groceries'],
      categoryGroupName: 'Food & Drink',
    });
  });

  it('rejects a non-positive month count', () => {
    expect(() => parser.parse({ months: 0 })).toThrow('months must be a positive number');
  });

  it('rejects a wrongly typed category filter', () => {
    expect(() => parser.parse({ categoryNames: 'Groceries' })).toThrow();
  });
});
