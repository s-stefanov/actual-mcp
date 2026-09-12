import { describe, it, expect } from 'vitest';
import { CashFlowReportBuilder } from './report-builder.js';
import type { CashFlowPeriod } from './types.js';

function period(key: string, income: number, expenses: number): CashFlowPeriod {
  const net = income - expenses;
  return { key, label: key, income, expenses, net, runningNet: net, transactions: 1 };
}

describe('CashFlowReportBuilder', () => {
  it('totals income, expenses and net across periods', () => {
    const report = new CashFlowReportBuilder().build({
      start: '2026-06-01',
      end: '2026-07-31',
      interval: 'monthly',
      periods: [period('2026-06', 500000, 200000), period('2026-07', 500000, 600000)],
    });

    expect(report.summary).toEqual({
      totalIncome: 1000000,
      totalExpenses: 800000,
      net: 200000,
      averageNetPerPeriod: 100000,
      negativePeriods: 1,
      periodCount: 2,
    });
    expect(report.accountName).toBeNull();
    expect(report.excludesTransfers).toBe(true);
    expect(report.amountsIn).toMatch(/cents/i);
  });

  it('avoids dividing by zero when there are no periods', () => {
    const report = new CashFlowReportBuilder().build({
      start: '2026-06-01',
      end: '2026-06-30',
      interval: 'weekly',
      periods: [],
    });

    expect(report.summary).toMatchObject({ net: 0, averageNetPerPeriod: 0, periodCount: 0, negativePeriods: 0 });
    expect(report.periods).toEqual([]);
  });

  it('counts a break-even period as not negative and keeps the account name', () => {
    const report = new CashFlowReportBuilder().build({
      start: '2026-06-01',
      end: '2026-06-30',
      interval: 'monthly',
      accountName: 'Checking',
      periods: [period('2026-06', 1000, 1000)],
    });

    expect(report.summary.negativePeriods).toBe(0);
    expect(report.accountName).toBe('Checking');
  });
});
