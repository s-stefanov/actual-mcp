// Fetches transactions and category metadata for category-trends tool
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import { fetchAllOnBudgetTransactions } from '../../core/data/fetch-transactions.js';
import { fetchAllCategories, fetchAllCategoryGroups } from '../../core/data/fetch-categories.js';
import type { Category, CategoryGroup, Transaction } from '../../core/types/domain.js';

export class CategoryTrendsDataFetcher {
  async fetchAll(
    start: string,
    end: string
  ): Promise<{ transactions: Transaction[]; categories: Category[]; groups: CategoryGroup[] }> {
    const accounts = await fetchAllAccounts();
    const [transactions, categories, groups] = await Promise.all([
      fetchAllOnBudgetTransactions(accounts, start, end),
      fetchAllCategories(),
      fetchAllCategoryGroups(),
    ]);

    return { transactions, categories, groups };
  }
}
