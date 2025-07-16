import type { MonthData } from '../../types.js';

export class MonthlySummaryCalculator {
  calculateAverages(sortedMonths: MonthData[]) {
    const totalIncome = sortedMonths.reduce((sum, m) => sum + m.income, 0);
    const totalExpenses = sortedMonths.reduce((sum, m) => sum + m.expenses, 0);
    const totalInvestments = sortedMonths.reduce((sum, m) => sum + m.investments, 0);
    const monthCount = sortedMonths.length;

    const avgIncome = monthCount > 0 ? totalIncome / monthCount : 0;
    const avgExpenses = monthCount > 0 ? totalExpenses / monthCount : 0;
    const avgInvestments = monthCount > 0 ? totalInvestments / monthCount : 0;

    const avgTraditionalSavings = avgIncome - avgExpenses;
    const avgTotalSavings = avgTraditionalSavings + avgInvestments;
    const avgTraditionalSavingsRate = avgIncome > 0 ? (avgTraditionalSavings / avgIncome) * 100 : 0;
    const avgTotalSavingsRate = avgIncome > 0 ? ((avgTraditionalSavings + avgInvestments) / avgIncome) * 100 : 0;

    return {
      avgIncome,
      avgExpenses,
      avgInvestments,
      avgTraditionalSavings,
      avgTotalSavings,
      avgTraditionalSavingsRate,
      avgTotalSavingsRate,
    };
  }
}
