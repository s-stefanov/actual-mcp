// Shapes aggregated budget months into the JSON payload for budget-vs-actual
import type { BudgetVsActualReportData, CategoryBudgetRow, MonthBudgetReport } from './types.js';

export interface OverspentCategory extends CategoryBudgetRow {
  month: string;
  overBy: number;
}

export interface BudgetVsActualReport {
  amountsIn: string;
  categoryGroupName: string | null;
  months: MonthBudgetReport[];
  overspentCategories: OverspentCategory[];
  missingMonths: string[];
}

const AMOUNTS_IN =
  'Integer cents. `spent` is a positive magnitude; `balance` is signed, so a negative balance means overspent.';

export class BudgetVsActualReportBuilder {
  build(data: BudgetVsActualReportData): BudgetVsActualReport {
    return {
      amountsIn: AMOUNTS_IN,
      categoryGroupName: data.categoryGroupName ?? null,
      months: data.months,
      overspentCategories: this.collectOverspent(data.months),
      missingMonths: data.missingMonths,
    };
  }

  private collectOverspent(months: MonthBudgetReport[]): OverspentCategory[] {
    return months
      .flatMap((month) =>
        month.groups.flatMap((group) =>
          group.categories
            .filter((category) => category.balance < 0)
            .map((category) => ({ ...category, month: month.month, overBy: Math.abs(category.balance) }))
        )
      )
      .sort((a, b) => b.overBy - a.overBy);
  }
}
