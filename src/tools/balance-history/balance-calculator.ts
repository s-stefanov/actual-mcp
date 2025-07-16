// Calculates balance history per month for balance-history tool
import type { Transaction } from '../../types.js';

export interface MonthBalance {
  year: number;
  month: number;
  balance: number;
  transactions: number;
}

export class BalanceHistoryCalculator {
  calculate(transactions: Transaction[], currentBalance: number, months: number, endDate: Date): MonthBalance[] {
    const balanceHistory: Record<string, MonthBalance> = {};
    let runningBalance: number = currentBalance;

    // Sort transactions by date (newest first)
    const sortedTransactions: Transaction[] = [...transactions].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Initialize with current balance for current month
    const currentYearMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;

    balanceHistory[currentYearMonth] = {
      year: endDate.getFullYear(),
      month: endDate.getMonth() + 1,
      balance: runningBalance,
      transactions: 0,
    };

    // Process transactions to calculate past balances
    sortedTransactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Subtract transaction amount from running balance (going backwards in time)
      runningBalance -= transaction.amount;

      if (!balanceHistory[yearMonth]) {
        balanceHistory[yearMonth] = {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          balance: runningBalance,
          transactions: 0,
        };
      }

      balanceHistory[yearMonth].transactions += 1;
    });

    // Convert to array and sort by date
    let sortedMonths: MonthBalance[] = Object.values(balanceHistory).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    // Only include the most recent N months
    if (sortedMonths.length > months) {
      sortedMonths = sortedMonths.slice(sortedMonths.length - months);
    }

    return sortedMonths;
  }
}
