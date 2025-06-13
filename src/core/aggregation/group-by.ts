// Aggregates category spendings into groups and sorts them
import type { CategorySpending, GroupSpending } from "../types/domain.js";

export class GroupAggregator {
  aggregateAndSort(
    spendingByCategory: Record<string, CategorySpending>
  ): GroupSpending[] {
    const spendingByGroup: Record<string, GroupSpending> = {};
    Object.values(spendingByCategory).forEach((category) => {
      if (!spendingByGroup[category.group]) {
        spendingByGroup[category.group] = {
          name: category.group,
          total: 0,
          categories: [],
        };
      }
      spendingByGroup[category.group].total += category.total;
      spendingByGroup[category.group].categories.push(category);
    });
    // Sort groups by absolute total (descending)
    const sortedGroups: GroupSpending[] = Object.values(spendingByGroup).sort(
      (a, b) => Math.abs(b.total) - Math.abs(a.total)
    );
    // Sort categories within each group by absolute total (descending)
    sortedGroups.forEach((group) => {
      group.categories.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    });
    return sortedGroups;
  }
}
