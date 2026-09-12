import type { Transaction, MonthData } from '../../types.js';

export class MonthlySummaryTransactionAggregator {
  aggregate(transactions: Transaction[], incomeCategories: Set<string>, start: string, end: string): MonthData[] {
    const monthlyData: Record<string, MonthData> = {};
    const [startYear, startMonth] = start.split('-').map(Number);
    const [endYear, endMonth] = end.split('-').map(Number);

    for (let index = startYear * 12 + startMonth - 1; index <= endYear * 12 + endMonth - 1; index++) {
      const year = Math.floor(index / 12);
      const month = (index % 12) + 1;
      monthlyData[`${year}-${String(month).padStart(2, '0')}`] = {
        year,
        month,
        income: 0,
        expenses: 0,
        transactions: 0,
      };
    }

    transactions.forEach((transaction) => {
      // # Reason: Uncategorized transfer legs move existing funds without changing income or expenses.
      if (transaction.transfer_id && !transaction.category) return;

      const month = monthlyData[transaction.date.slice(0, 7)];
      if (!month) return;

      if (transaction.category && incomeCategories.has(transaction.category)) {
        month.income += transaction.amount;
      } else {
        month.expenses -= transaction.amount;
      }
      month.transactions += 1;
    });

    return Object.values(monthlyData);
  }
}
