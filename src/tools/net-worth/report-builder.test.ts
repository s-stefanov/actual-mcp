import { describe, it, expect } from 'vitest';
import { NetWorthReportBuilder } from './report-builder.js';
import type { NetWorthMonth } from './types.js';

const months: NetWorthMonth[] = [
  {
    month: '2026-06',
    assets: 100000,
    liabilities: 50000,
    netWorth: 50000,
    accounts: [
      { id: 'a', name: 'Checking', offBudget: false, balance: 100000 },
      { id: 'b', name: 'Loan', offBudget: true, balance: -50000 },
    ],
  },
  {
    month: '2026-07',
    assets: 120000,
    liabilities: 40000,
    netWorth: 80000,
    change: 30000,
    accounts: [
      { id: 'b', name: 'Loan', offBudget: true, balance: -40000 },
      { id: 'a', name: 'Checking', offBudget: false, balance: 120000 },
    ],
  },
];

describe('NetWorthReportBuilder', () => {
  it('strips per-month accounts and returns the latest breakdown sorted by balance', () => {
    const report = new NetWorthReportBuilder().build({ months, includeOffBudget: true, includeClosed: false });

    // Reason: accounts would otherwise repeat on every month of the series.
    expect(report.months.every((m) => !('accounts' in m))).toBe(true);
    expect(report.months.map((m) => m.month)).toEqual(['2026-06', '2026-07']);
    expect(report.latestAccounts.map((a) => a.name)).toEqual(['Checking', 'Loan']);
    expect(report.amountsIn).toMatch(/cents/i);
  });

  it('computes the period change with a percentage', () => {
    const report = new NetWorthReportBuilder().build({ months, includeOffBudget: true, includeClosed: false });

    expect(report.periodChange).toEqual({
      fromMonth: '2026-06',
      toMonth: '2026-07',
      amount: 30000,
      percent: 60,
    });
  });

  it('returns a null percent rather than dividing by zero', () => {
    const zeroStart: NetWorthMonth[] = [
      { month: '2026-06', assets: 0, liabilities: 0, netWorth: 0, accounts: [] },
      { month: '2026-07', assets: 5000, liabilities: 0, netWorth: 5000, change: 5000, accounts: [] },
    ];

    const report = new NetWorthReportBuilder().build({
      months: zeroStart,
      includeOffBudget: true,
      includeClosed: false,
    });

    expect(report.periodChange).toMatchObject({ amount: 5000, percent: null });
  });

  it('uses a negative starting net worth as a positive denominator', () => {
    const negativeStart: NetWorthMonth[] = [
      { month: '2026-06', assets: 0, liabilities: 10000, netWorth: -10000, accounts: [] },
      { month: '2026-07', assets: 0, liabilities: 5000, netWorth: -5000, change: 5000, accounts: [] },
    ];

    const report = new NetWorthReportBuilder().build({
      months: negativeStart,
      includeOffBudget: true,
      includeClosed: false,
    });

    expect(report.periodChange).toMatchObject({ amount: 5000, percent: 50 });
  });

  it('returns no period change for a single month, and empty accounts for no months', () => {
    const one = new NetWorthReportBuilder().build({
      months: [months[0]],
      includeOffBudget: true,
      includeClosed: false,
    });
    expect(one.periodChange).toBeNull();

    const none = new NetWorthReportBuilder().build({ months: [], includeOffBudget: false, includeClosed: true });
    expect(none.periodChange).toBeNull();
    expect(none.latestAccounts).toEqual([]);
  });
});
