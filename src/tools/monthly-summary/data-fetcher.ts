import {
  getAccounts,
  getCategories,
  getTransactions,
} from "../../actual-api.js";
import type { Account, Category, Transaction } from "../../types.js";

export class MonthlySummaryDataFetcher {
  /**
   * Fetch accounts, categories, and all transactions for the given period.
   * If accountId is provided, only fetch transactions for that account.
   */
  async fetchAll(
    accountId: string | undefined,
    start: string,
    end: string
  ): Promise<{
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
  }> {
    const accounts = await getAccounts();
    const categories = await getCategories();

    let transactions: Transaction[] = [];
    if (accountId) {
      transactions = await getTransactions(accountId, start, end);
    } else {
      const onBudgetAccounts = accounts.filter(
        (a: Account) => !a.offbudget && !a.closed
      );
      for (const account of onBudgetAccounts) {
        const tx = await getTransactions(account.id, start, end);
        transactions = [...transactions, ...tx];
      }
    }

    return { accounts, categories, transactions };
  }
}
