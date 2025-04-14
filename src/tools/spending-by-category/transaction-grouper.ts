// Groups transactions by category and aggregates spending
import type { Transaction } from "../../types.js";
import type { CategoryGroupInfo } from "./category-mapper.js";
import type { CategorySpending } from "./types.js";

export class SpendingByCategoryTransactionGrouper {
  groupByCategory(
    transactions: Transaction[],
    getCategoryName: (categoryId: string) => string,
    getGroupInfo: (categoryId: string) => CategoryGroupInfo | undefined,
    includeIncome: boolean
  ): Record<string, CategorySpending> {
    const spendingByCategory: Record<string, CategorySpending> = {};
    transactions.forEach((transaction) => {
      if (!transaction.category) return; // Skip uncategorized
      const categoryId = transaction.category;
      const categoryName = getCategoryName(categoryId);
      const group = getGroupInfo(categoryId) || { name: "Unknown Group", isIncome: false };
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
