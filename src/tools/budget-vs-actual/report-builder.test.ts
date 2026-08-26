import { describe, it, expect } from 'vitest';
import { BudgetVsActualReportBuilder } from './report-builder.js';
import type { MonthBudgetReport } from './types.js';

function month(overrides: Partial<MonthBudgetReport> = {}): MonthBudgetReport {
  return {
    month: '2026-07',
    totalBudgeted: -100000,
    totalSpent: -80000,
    toBudget: 25000,
    groups: [
      {
        id: 'g1',
        name: 'Food & Drink',
        budgeted: 60000,
        spent: 70000,
        balance: -10000,
        categories: [
          {
            id: 'c1',
            name: 'Groceries',
            group: 'Food & Drink',
            budgeted: 40000,
            spent: 45000,
            balance: -5000,
            carryover: false,
          },
          {
            id: 'c2',
            name: 'Coffee',
            group: 'Food & Drink',
            budgeted: 20000,
            spent: 25000,
            balance: -15000,
            carryover: false,
          },
          {
            id: 'c3',
            name: 'Alcohol',
            group: 'Food & Drink',
            budgeted: 10000,
            spent: 5000,
            balance: 5000,
            carryover: false,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('BudgetVsActualReportBuilder', () => {
  it('returns the months unchanged and documents the amount units', () => {
    const report = new BudgetVsActualReportBuilder().build({ months: [month()], missingMonths: [] });

    expect(report.months).toHaveLength(1);
    expect(report.months[0].toBudget).toBe(25000);
    expect(report.amountsIn).toMatch(/cents/i);
    expect(report.categoryGroupName).toBeNull();
  });

  it('collects overspent categories across months, worst first', () => {
    const report = new BudgetVsActualReportBuilder().build({
      months: [month(), month({ month: '2026-08' })],
      missingMonths: [],
    });

    expect(report.overspentCategories.map((c) => [c.month, c.name, c.overBy])).toEqual([
      ['2026-07', 'Coffee', 15000],
      ['2026-08', 'Coffee', 15000],
      ['2026-07', 'Groceries', 5000],
      ['2026-08', 'Groceries', 5000],
    ]);
    // A positive balance is not overspending.
    expect(report.overspentCategories.some((c) => c.name === 'Alcohol')).toBe(false);
  });

  it('reports an empty overspend list and passes through missing months', () => {
    const healthy = month({
      groups: [
        {
          id: 'g1',
          name: 'Housing',
          budgeted: 1000,
          spent: 500,
          balance: 500,
          categories: [
            { id: 'c9', name: 'Rent', group: 'Housing', budgeted: 1000, spent: 500, balance: 500, carryover: false },
          ],
        },
      ],
    });

    const report = new BudgetVsActualReportBuilder().build({
      months: [healthy],
      missingMonths: ['2026-09'],
      categoryGroupName: 'Housing',
    });

    expect(report.overspentCategories).toEqual([]);
    expect(report.missingMonths).toEqual(['2026-09']);
    expect(report.categoryGroupName).toBe('Housing');
  });

  it('handles a period with no budget data at all', () => {
    const report = new BudgetVsActualReportBuilder().build({ months: [], missingMonths: ['2026-07'] });

    expect(report.months).toEqual([]);
    expect(report.overspentCategories).toEqual([]);
  });
});
