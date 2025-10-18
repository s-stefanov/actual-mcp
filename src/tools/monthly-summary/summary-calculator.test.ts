import { describe, it, expect } from 'vitest';
import { MonthlySummaryCalculator } from './summary-calculator.js';
import type { MonthData } from '../../types.js';

describe('MonthlySummaryCalculator', () => {
  it('computes averages with investments reducing traditional savings', () => {
    const calculator = new MonthlySummaryCalculator();
    const months: MonthData[] = [
      {
        year: 2024,
        month: 1,
        income: 400000,
        expenses: 200000,
        investments: 50000,
        transactions: 10,
      },
      {
        year: 2024,
        month: 2,
        income: 300000,
        expenses: 150000,
        investments: 70000,
        transactions: 8,
      },
    ];

    const result = calculator.calculateAverages(months);

    expect(result.avgIncome).toBe(350000);
    expect(result.avgExpenses).toBe(175000);
    expect(result.avgInvestments).toBe(60000);
    expect(result.avgTraditionalSavings).toBe(115000);
    expect(result.avgTotalSavings).toBe(175000);
    expect(result.avgTraditionalSavingsRate).toBeCloseTo(32.857, 3);
    expect(result.avgTotalSavingsRate).toBeCloseTo(50, 3);
  });

  it('returns zeros when no month data is provided', () => {
    const calculator = new MonthlySummaryCalculator();

    const result = calculator.calculateAverages([]);

    expect(result).toEqual({
      avgIncome: 0,
      avgExpenses: 0,
      avgInvestments: 0,
      avgTraditionalSavings: 0,
      avgTotalSavings: 0,
      avgTraditionalSavingsRate: 0,
      avgTotalSavingsRate: 0,
    });
  });

  it('keeps savings rates at zero when average income is zero', () => {
    const calculator = new MonthlySummaryCalculator();
    const months: MonthData[] = [
      {
        year: 2024,
        month: 3,
        income: 0,
        expenses: 10000,
        investments: 5000,
        transactions: 4,
      },
    ];

    const result = calculator.calculateAverages(months);

    expect(result.avgTraditionalSavings).toBe(-15000);
    expect(result.avgTotalSavings).toBe(-10000);
    expect(result.avgTraditionalSavingsRate).toBe(0);
    expect(result.avgTotalSavingsRate).toBe(0);
  });
});
