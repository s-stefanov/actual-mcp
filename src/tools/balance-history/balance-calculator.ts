// Calculates balance history per month for balance-history tool
import type { Account, Transaction } from '../../types.js';

export interface MonthBalance {
  accountId?: string;
  account?: string;
  year: number;
  month: number;
  balance: number;
  transactions: number;
  change?: number;
  isPartial: boolean;
}

interface Month {
  year: number;
  month: number;
  key: string;
}

export class BalanceHistoryCalculator {
  calculate(
    account: Account | undefined,
    accounts: Account[],
    transactions: Transaction[],
    months: number,
    endDate: Date
  ): MonthBalance[] {
    const monthRange = this.monthRange(endDate, months);
    const selectedAccounts = account ? [account] : accounts;
    const accountIds = new Set(selectedAccounts.map(({ id }) => id));
    const transactionsByAccount = new Map<string, Transaction[]>();

    for (const transaction of [...transactions].sort((a, b) => b.date.localeCompare(a.date))) {
      if (!accountIds.has(transaction.account)) continue;
      const accountTransactions = transactionsByAccount.get(transaction.account) ?? [];
      accountTransactions.push(transaction);
      transactionsByAccount.set(transaction.account, accountTransactions);
    }

    const history = selectedAccounts.flatMap((selectedAccount) => {
      const accountTransactions = transactionsByAccount.get(selectedAccount.id) ?? [];
      const balances: MonthBalance[] = [];
      let transactionIndex = 0;
      let balance = selectedAccount.balance ?? 0;

      for (const currentMonth of monthRange) {
        while (accountTransactions[transactionIndex]?.date.slice(0, 7) > currentMonth.key) transactionIndex++;

        let transactionCount = 0;
        let transactionAmount = 0;
        while (accountTransactions[transactionIndex]?.date.slice(0, 7) === currentMonth.key) {
          const transaction = accountTransactions[transactionIndex++];
          transactionCount++;
          transactionAmount += transaction.amount;
        }

        balances.push({
          accountId: selectedAccount.id,
          ...(account ? {} : { account: selectedAccount.name }),
          year: currentMonth.year,
          month: currentMonth.month,
          balance,
          transactions: transactionCount,
          isPartial: currentMonth.year === endDate.getFullYear() && currentMonth.month === endDate.getMonth() + 1,
        });
        balance -= transactionAmount;
      }

      for (let index = balances.length - 2; index >= 0; index--) {
        balances[index].change = balances[index].balance - balances[index + 1].balance;
      }

      return balances;
    });

    return history.sort(
      (a, b) => b.year - a.year || b.month - a.month || (a.accountId ?? '').localeCompare(b.accountId ?? '')
    );
  }

  private monthRange(endDate: Date, months: number): Month[] {
    return Array.from({ length: months }, (_, offset) => {
      const absoluteMonth = endDate.getFullYear() * 12 + endDate.getMonth() - offset;
      const year = Math.floor(absoluteMonth / 12);
      const month = (absoluteMonth % 12) + 1;
      return { year, month, key: `${year}-${String(month).padStart(2, '0')}` };
    });
  }
}
