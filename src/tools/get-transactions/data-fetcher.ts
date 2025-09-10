// Fetches transactions and related data for get-transactions tool
import { fetchTransactionsForAccount } from '../../core/data/fetch-transactions.js';
import { fetchAllCategories } from '../../core/index.js';
import type { Transaction } from '../../core/types/domain.js';

export class GetTransactionsDataFetcher {
  async fetch(accountId: string, start: string, end: string): Promise<Transaction[]> {
    const [categories, transactions] = await Promise.all([
      fetchAllCategories(),
      fetchTransactionsForAccount(accountId, start, end),
    ]);

    // Create category ID to name mapping
    const categoryMap = categories.reduce(
      (acc, category) => {
        acc[category.id] = category.name;
        return acc;
      },
      {} as Record<string, string>
    );

    // Map category IDs to category names in transactions
    const transactionsWithCategoryNames = transactions.map((transaction) => ({
      ...transaction,
      category_name: transaction.category ? categoryMap[transaction.category] : undefined,
    }));

    return transactionsWithCategoryNames;
  }
}
