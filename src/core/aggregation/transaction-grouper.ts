// Groups transactions by category and aggregates spending
import type { Transaction, CategorySpending, CategoryGroupInfo } from '../types/domain.js';

export class TransactionGrouper {
  groupByCategory(
    transactions: Transaction[],
    getCategoryName: (categoryId: string) => string,
    getGroupInfo: (categoryId: string) => CategoryGroupInfo | undefined,
    includeIncome: boolean,
    includeUncategorized = false
  ): Record<string, CategorySpending> {
    const spendingByCategory: Record<string, CategorySpending> = {};
    // # Reason: A split parent has no category; its legs carry the real categories and amounts.
    const legs = transactions.flatMap((transaction) =>
      transaction.subtransactions?.length ? transaction.subtransactions : [transaction]
    );
    legs.forEach((transaction) => {
      if (!transaction.category) {
        // Uncategorized transfer legs move money between accounts, so they are never counted.
        if (!includeUncategorized || transaction.transfer_id) return;
        const entry = (spendingByCategory['uncategorized'] ??= {
          id: 'uncategorized',
          name: 'Uncategorized',
          group: 'Uncategorized',
          isIncome: false,
          total: 0,
          transactions: 0,
        });
        entry.total += transaction.amount;
        entry.transactions += 1;
        return;
      }
      const categoryId = transaction.category;
      const categoryName = getCategoryName(categoryId);
      const group = getGroupInfo(categoryId) || {
        name: 'Unknown Group',
        isIncome: false,
      };
      // Skip income categories if not requested
      if (group.isIncome && !includeIncome) return;
      if (!spendingByCategory[categoryId]) {
        spendingByCategory[categoryId] = {
          id: categoryId,
          name: categoryName,
          group: group.name,
          isIncome: group.isIncome,
          total: 0,
          transactions: 0,
        };
      }
      spendingByCategory[categoryId].total += transaction.amount;
      spendingByCategory[categoryId].transactions += 1;
    });
    return spendingByCategory;
  }
}
