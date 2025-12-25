import { Transaction, MonthData } from '../../types.js';

export class MonthlySummaryTransactionAggregator {
  aggregate(
    transactions: Transaction[],
    incomeCategories: Set<string>,
    investmentSavingsCategories: Set<string>
  ): MonthData[] {
    const monthlyData: Record<string, MonthData> = {};

    transactions.forEach((transaction) => {
      if (transaction.transfer_id && !transaction.category) {
        // # Reason: Transfers move funds between internal accounts and should not affect income, expenses, or counts.
        // If the transfer moves between on-budget and off-budget accounts, we may handle it differently later.
        return;
      }

      // Parse date string directly to avoid timezone issues.
      // new Date('2024-02-01') is interpreted as UTC midnight, which when converted
      // to local time can shift to the previous month in western timezones.
      const [year, month] = transaction.date.split('-').map(Number);
      const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

      if (!monthlyData[yearMonth]) {
        monthlyData[yearMonth] = {
          year,
          month,
          income: 0,
          expenses: 0,
          investments: 0,
          transactions: 0,
        };
      }

      const isIncome = transaction.category ? incomeCategories.has(transaction.category) : false;
      const isInvestmentOrSavings = transaction.category
        ? investmentSavingsCategories.has(transaction.category)
        : false;

      if (isIncome || transaction.amount > 0) {
        monthlyData[yearMonth].income += Math.abs(transaction.amount);
      } else if (isInvestmentOrSavings) {
        monthlyData[yearMonth].investments += Math.abs(transaction.amount);
      } else {
        monthlyData[yearMonth].expenses += Math.abs(transaction.amount);
      }

      monthlyData[yearMonth].transactions += 1;
    });

    return Object.values(monthlyData).sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
  }
}
