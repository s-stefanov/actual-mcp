import type { MonthData } from '../../types.js';

export class MonthlySummaryCalculator {
  calculateAverages(sortedMonths: MonthData[]): {
    avgIncome: number;
    avgExpenses: number;
    avgSavings: number;
    avgSavingsRate: number;
  } {
    const totalIncome = sortedMonths.reduce((sum, m) => sum + m.income, 0);
    const totalExpenses = sortedMonths.reduce((sum, m) => sum + m.expenses, 0);
    const monthCount = sortedMonths.length;

    const avgIncome = monthCount > 0 ? totalIncome / monthCount : 0;
    const avgExpenses = monthCount > 0 ? totalExpenses / monthCount : 0;
    const avgSavings = avgIncome - avgExpenses;
    const avgSavingsRate = avgIncome > 0 ? (avgSavings / avgIncome) * 100 : 0;

    return { avgIncome, avgExpenses, avgSavings, avgSavingsRate };
  }
}
