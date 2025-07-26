// Calculates balance history per month for balance-history tool
import type { Account, Transaction } from "../../types.js";

export interface MonthBalance {
  account?: string;
  year: number;
  month: number;
  balance: number;
  transactions: number;
  change?: number;
}

export class BalanceHistoryCalculator {
  // Helper function to calculate changes between months for single account
  private calculateChanges(monthBalances: MonthBalance[]): void {
    // Sort by date (oldest first) for change calculation
    const sortedByDate = [...monthBalances].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    for (let i = 1; i < sortedByDate.length; i++) {
      const current = sortedByDate[i];
      const previous = sortedByDate[i - 1];
      current.change = current.balance - previous.balance;
    }

    // First month has no change to compare to
    if (sortedByDate.length > 0) {
      sortedByDate[0].change = undefined;
    }
  }

  // Helper function to calculate changes for multiple accounts
  private calculateChangesForMultipleAccounts(
    monthBalances: MonthBalance[]
  ): void {
    // Group by account
    const accountGroups = new Map<string, MonthBalance[]>();

    monthBalances.forEach((month) => {
      const accountName = month.account || "";
      if (!accountGroups.has(accountName)) {
        accountGroups.set(accountName, []);
      }
      accountGroups.get(accountName)!.push(month);
    });

    // Calculate changes for each account separately
    accountGroups.forEach((accountMonths) => {
      // Sort by date (oldest first) for change calculation
      const sortedByDate = accountMonths.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      for (let i = 1; i < sortedByDate.length; i++) {
        const current = sortedByDate[i];
        const previous = sortedByDate[i - 1];
        current.change = current.balance - previous.balance;
      }

      // First month has no change to compare to
      if (sortedByDate.length > 0) {
        sortedByDate[0].change = undefined;
      }
    });
  }

  // Helper function to generate all months in range
  private generateMonthRange(
    endDate: Date,
    months: number
  ): Array<{ year: number; month: number; yearMonth: string }> {
    const monthsArray = [];
    const currentDate = new Date(endDate);

    for (let i = 0; i < months; i++) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

      monthsArray.push({ year, month, yearMonth });

      // Go back one month
      currentDate.setMonth(currentDate.getMonth() - 1);
    }

    return monthsArray;
  }

  calculate(
    account: Account | undefined,
    accounts: Account[],
    transactions: Transaction[],
    months: number,
    endDate: Date
  ): MonthBalance[] {
    // Sort transactions by date (newest first)
    const sortedTransactions: Transaction[] = [...transactions].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Generate all months we need to include
    const monthRange = this.generateMonthRange(endDate, months);

    // Single-account mode
    if (account) {
      const balanceHistory: Record<string, MonthBalance> = {};

      let runningBalance: number = account.balance ?? 0;

      // Initialize all months with current balance and 0 transactions
      monthRange.forEach(({ year, month, yearMonth }) => {
        balanceHistory[yearMonth] = {
          year,
          month,
          balance: runningBalance,
          transactions: 0,
        };
      });

      // Process transactions and update balances/transaction counts
      sortedTransactions.forEach((transaction) => {
        const date = new Date(transaction.date);
        const yearMonth: string = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        runningBalance -= transaction.amount;

        // Update balance for this month and all previous months
        monthRange.forEach(({ yearMonth: monthKey }) => {
          if (balanceHistory[monthKey] && monthKey <= yearMonth) {
            balanceHistory[monthKey].balance = runningBalance;
          }
        });

        // Increment transaction count for the specific month
        if (balanceHistory[yearMonth]) {
          balanceHistory[yearMonth].transactions += 1;
        }
      });

      // Convert to array and sort by date (newest first)
      const sortedMonths: MonthBalance[] = Object.values(balanceHistory).sort(
        (a, b) => {
          if (a.year !== b.year) return b.year - a.year; // Reversed
          return b.month - a.month; // Reversed
        }
      );

      // Calculate changes between months
      this.calculateChanges(sortedMonths);

      return sortedMonths;
    } else {
      // All-accounts mode
      const balanceHistory: Record<string, Record<string, MonthBalance>> = {};

      const accountIndexMap = new Map(accounts.map((a, i) => [a.id, i]));
      const runningBalances: number[] = accounts.map((a) => a.balance ?? 0);

      // Initialize all accounts and all months
      for (const acc of accounts) {
        balanceHistory[acc.name] = {};
        monthRange.forEach(({ year, month, yearMonth }) => {
          balanceHistory[acc.name][yearMonth] = {
            year,
            month,
            balance: acc.balance ?? 0,
            transactions: 0,
          };
        });
      }

      // Process transactions
      sortedTransactions.forEach((transaction) => {
        const accIndex = accountIndexMap.get(transaction.account);
        if (accIndex === undefined) return;

        const date = new Date(transaction.date);
        const yearMonth: string = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        runningBalances[accIndex] -= transaction.amount;

        // Update balance for this month and all previous months for this account
        monthRange.forEach(({ yearMonth: monthKey }) => {
          if (
            balanceHistory[accounts[accIndex].name][monthKey] &&
            monthKey <= yearMonth
          ) {
            balanceHistory[accounts[accIndex].name][monthKey].balance =
              runningBalances[accIndex];
          }
        });

        // Increment transaction count for the specific month
        if (balanceHistory[accounts[accIndex].name][yearMonth]) {
          balanceHistory[accounts[accIndex].name][yearMonth].transactions += 1;
        }
      });

      // Convert nested records to array with account names
      let sortedMonths: MonthBalance[] = Object.entries(balanceHistory).flatMap(
        ([accountName, months]) =>
          Object.values(months).map((month) => ({
            ...month,
            account: accountName,
          }))
      );

      // Sort by date (newest first) and then by account name
      sortedMonths.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year; // Reversed
        if (a.month !== b.month) return b.month - a.month; // Reversed
        return (a.account ?? "").localeCompare(b.account ?? "");
      });

      // Calculate changes between months for each account
      this.calculateChangesForMultipleAccounts(sortedMonths);

      return sortedMonths;
    }
  }
}
