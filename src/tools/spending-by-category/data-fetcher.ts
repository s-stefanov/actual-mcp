// Fetches accounts, categories, groups, and transactions for spending-by-category tool
import { getAccounts, getCategories, getCategoryGroups, getTransactions } from "../../actual-api.js";
import type { Account, Category, CategoryGroup, Transaction } from "../../types.js";

export class SpendingByCategoryDataFetcher {
  /**
   * Fetch all required data for the spending-by-category tool.
   * If accountId is provided, only fetch transactions for that account.
   */
  async fetchAll(
    accountId: string | undefined,
    start: string,
    end: string
  ): Promise<{
    accounts: Account[];
    categories: Category[];
    categoryGroups: CategoryGroup[];
    transactions: Transaction[];
  }> {
    const accounts = await getAccounts();
    const categories = await getCategories();
    const categoryGroups = await getCategoryGroups();

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
    return { accounts, categories, categoryGroups, transactions };
  }
}
