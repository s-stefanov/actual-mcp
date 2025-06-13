import { fetchAllAccounts } from "../../core/data/fetch-accounts.js";
import { fetchAllCategories } from "../../core/data/fetch-categories.js";
import { fetchTransactionsForAccount, fetchAllOnBudgetTransactions } from "../../core/data/fetch-transactions.js";
import type { Account, Category, Transaction } from "../../core/types/domain.js";

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
    const accounts = await fetchAllAccounts();
    const categories = await fetchAllCategories();

    let transactions: Transaction[] = [];
    if (accountId) {
      transactions = await fetchTransactionsForAccount(accountId, start, end);
    } else {
      transactions = await fetchAllOnBudgetTransactions(accounts, start, end);
    }

    return { accounts, categories, transactions };
  }
}
