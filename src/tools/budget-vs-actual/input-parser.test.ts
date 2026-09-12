import { describe, it, expect } from 'vitest';
import { BudgetVsActualInputParser } from './input-parser.js';

describe('BudgetVsActualInputParser', () => {
  const parser = new BudgetVsActualInputParser();

  it('applies defaults when no arguments are given', () => {
    expect(parser.parse({})).toEqual({ months: 3, includeHidden: false, categoryGroupName: undefined });
    expect(parser.parse(undefined)).toEqual({ months: 3, includeHidden: false, categoryGroupName: undefined });
  });

  it('passes through supplied values', () => {
    expect(parser.parse({ months: 12, includeHidden: true, categoryGroupName: 'Housing' })).toEqual({
      months: 12,
      includeHidden: true,
      categoryGroupName: 'Housing',
    });
  });

  it('rejects a non-positive month count', () => {
    expect(() => parser.parse({ months: 0 })).toThrow('months must be a positive number');
    expect(() => parser.parse({ months: -1 })).toThrow('months must be a positive number');
  });

  it('rejects a wrongly typed argument', () => {
    expect(() => parser.parse({ months: 'three' })).toThrow();
  });
});
