import { describe, it, expect } from 'vitest';
import { MonthlySummaryCalculator } from './summary-calculator.js';
import type { MonthData } from '../../types.js';

describe('MonthlySummaryCalculator', () => {
  const calculator = new MonthlySummaryCalculator();

  it('includes empty months in averages and calculates savings from net expenses', () => {
    const months: MonthData[] = [
      { year: 2026, month: 1, income: 10_000, expenses: 3_000, transactions: 3 },
      { year: 2026, month: 2, income: 0, expenses: 0, transactions: 0 },
    ];

    expect(calculator.calculateAverages(months)).toEqual({
      avgIncome: 5_000,
      avgExpenses: 1_500,
      avgSavings: 3_500,
      avgSavingsRate: 70,
    });
  });

  it('returns zeros when no month data is provided', () => {
    expect(calculator.calculateAverages([])).toEqual({
      avgIncome: 0,
      avgExpenses: 0,
      avgSavings: 0,
      avgSavingsRate: 0,
    });
  });

  it.each([0, -200])('keeps savings rate at zero when income is %s', (income) => {
    expect(calculator.calculateAverages([{ year: 2026, month: 3, income, expenses: 10_000, transactions: 4 }])).toEqual(
      { avgIncome: income, avgExpenses: 10_000, avgSavings: income - 10_000, avgSavingsRate: 0 }
    );
  });
});
