// Reshapes raw budget months into the rows rendered by budget-vs-actual
import type { BudgetMonth, BudgetMonthGroup } from '../../types.js';
import type { CategoryBudgetRow, GroupBudgetRow, MonthBudgetReport } from './types.js';

export interface BudgetAggregatorOptions {
  includeHidden: boolean;
  categoryGroupName?: string;
}

export class BudgetVsActualAggregator {
  aggregate(budgetMonths: BudgetMonth[], options: BudgetAggregatorOptions): MonthBudgetReport[] {
    return budgetMonths.map((budgetMonth) => ({
      month: budgetMonth.month,
      totalBudgeted: budgetMonth.totalBudgeted,
      totalSpent: budgetMonth.totalSpent,
      toBudget: budgetMonth.toBudget,
      groups: this.buildGroups(budgetMonth.categoryGroups ?? [], options),
    }));
  }

  private buildGroups(groups: BudgetMonthGroup[], options: BudgetAggregatorOptions): GroupBudgetRow[] {
    return groups
      .filter((group) => !group.is_income)
      .filter((group) => options.includeHidden || !group.hidden)
      .filter(
        (group) => !options.categoryGroupName || group.name.toLowerCase() === options.categoryGroupName.toLowerCase()
      )
      .map((group) => ({
        id: group.id,
        name: group.name,
        budgeted: group.budgeted ?? 0,
        // Reason: Actual reports outflow as a negative `spent`; the report shows
        // spending as a positive magnitude, so normalize the sign once here.
        spent: Math.abs(group.spent ?? 0),
        balance: group.balance ?? 0,
        categories: this.buildCategories(group, options),
      }));
  }

  private buildCategories(group: BudgetMonthGroup, options: BudgetAggregatorOptions): CategoryBudgetRow[] {
    return (group.categories ?? [])
      .filter((category) => options.includeHidden || !category.hidden)
      .map((category) => ({
        id: category.id,
        name: category.name,
        group: group.name,
        budgeted: category.budgeted ?? 0,
        spent: Math.abs(category.spent ?? 0),
        balance: category.balance ?? 0,
        carryover: Boolean(category.carryover),
      }));
  }
}
