import { describe, it, expect } from 'vitest';
import { NetWorthCalculator } from './net-worth-calculator.js';
import type { AccountBalanceAtMonth } from './types.js';

function balances(...entries: Array<[string, number, boolean?]>): AccountBalanceAtMonth[] {
  return entries.map(([name, balance, offBudget]) => ({
    id: name,
    name,
    balance,
    offBudget: Boolean(offBudget),
  }));
}

describe('NetWorthCalculator', () => {
  it('splits positive and negative balances into assets and liabilities', () => {
    const byMonth = new Map<string, AccountBalanceAtMonth[]>([
      ['2026-06', balances(['Checking', 100000], ['Brokerage', 500000, true], ['Loan', -250000, true])],
      ['2026-07', balances(['Checking', 120000], ['Brokerage', 520000, true], ['Loan', -240000, true])],
    ]);

    const result = new NetWorthCalculator().calculate(['2026-06', '2026-07'], byMonth);

    expect(result[0]).toMatchObject({ assets: 600000, liabilities: 250000, netWorth: 350000 });
    expect(result[0].change).toBeUndefined();

    expect(result[1]).toMatchObject({ assets: 640000, liabilities: 240000, netWorth: 400000 });
    expect(result[1].change).toBe(50000);
  });

  it('treats a month with no account data as zero rather than skipping it', () => {
    const byMonth = new Map<string, AccountBalanceAtMonth[]>([['2026-06', balances(['Checking', 10000])]]);

    const result = new NetWorthCalculator().calculate(['2026-06', '2026-07'], byMonth);

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ assets: 0, liabilities: 0, netWorth: 0, accounts: [] });
    expect(result[1].change).toBe(-10000);
  });

  it('reports a negative net worth when liabilities exceed assets', () => {
    const byMonth = new Map<string, AccountBalanceAtMonth[]>([
      ['2026-07', balances(['Checking', 5000], ['Loan', -50000])],
    ]);

    const result = new NetWorthCalculator().calculate(['2026-07'], byMonth);

    expect(result[0]).toMatchObject({ assets: 5000, liabilities: 50000, netWorth: -45000 });
  });
});
