// Builds the category-by-month matrix and trend direction for category-trends tool
import type { Category, CategoryGroup, Transaction } from '../../core/types/domain.js';
import type { CategoryTrendRow, TrendDirection } from './types.js';

export interface TrendAggregatorOptions {
  months: string[];
  includeIncome: boolean;
  categoryNames?: string[];
  categoryGroupName?: string;
}

// Reason: below this relative swing the two halves are treated as unchanged,
// so ordinary month-to-month noise is not reported as a trend.
const FLAT_THRESHOLD_PERCENT = 5;

export class CategoryTrendsAggregator {
  aggregate(
    transactions: Transaction[],
    categories: Category[],
    groups: CategoryGroup[],
    options: TrendAggregatorOptions
  ): CategoryTrendRow[] {
    const groupsById = new Map(groups.map((group) => [group.id, group]));
    const selected = this.selectCategories(categories, groupsById, options);
    if (selected.length === 0) return [];

    const rows = new Map<string, CategoryTrendRow>();
    selected.forEach((category) => {
      rows.set(category.id, {
        id: category.id,
        name: category.name,
        group: groupsById.get(category.group_id)?.name ?? 'Unknown',
        amountsByMonth: Object.fromEntries(options.months.map((month) => [month, 0])),
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        trend: 'flat',
      });
    });

    transactions.forEach((transaction) => {
      if (!transaction.category) return;
      const row = rows.get(transaction.category);
      if (!row) return;

      const month = transaction.date.slice(0, 7);
      if (!(month in row.amountsByMonth)) return;

      // Reason: expenses arrive as negative amounts; the matrix reports magnitudes.
      row.amountsByMonth[month] += Math.abs(transaction.amount);
    });

    return [...rows.values()]
      .map((row) => this.summarize(row, options.months))
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total);
  }

  private selectCategories(
    categories: Category[],
    groupsById: Map<string, CategoryGroup>,
    options: TrendAggregatorOptions
  ): Category[] {
    const wantedNames = options.categoryNames?.map((name) => name.toLowerCase());

    return categories
      .filter((category) => options.includeIncome || !category.is_income)
      .filter((category) => !wantedNames || wantedNames.includes(category.name.toLowerCase()))
      .filter((category) => {
        if (!options.categoryGroupName) return true;
        const group = groupsById.get(category.group_id);
        return group?.name.toLowerCase() === options.categoryGroupName.toLowerCase();
      });
  }

  private summarize(row: CategoryTrendRow, months: string[]): CategoryTrendRow {
    const amounts = months.map((month) => row.amountsByMonth[month] ?? 0);
    const total = amounts.reduce((sum, amount) => sum + amount, 0);

    const { trend, changePercent } = this.detectTrend(amounts);

    return {
      ...row,
      total,
      average: amounts.length > 0 ? total / amounts.length : 0,
      min: amounts.length > 0 ? Math.min(...amounts) : 0,
      max: amounts.length > 0 ? Math.max(...amounts) : 0,
      trend,
      changePercent,
    };
  }

  /**
   * Compare the average of the first half of the period against the second half.
   * A single-month period has no trend to detect.
   */
  private detectTrend(amounts: number[]): { trend: TrendDirection; changePercent?: number } {
    if (amounts.length < 2) return { trend: 'flat' };

    const midpoint = Math.floor(amounts.length / 2);
    const firstHalf = amounts.slice(0, midpoint);
    const secondHalf = amounts.slice(midpoint);

    const average = (values: number[]): number =>
      values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

    const before = average(firstHalf);
    const after = average(secondHalf);

    if (before === 0) {
      return after === 0 ? { trend: 'flat' } : { trend: 'rising' };
    }

    const changePercent = ((after - before) / before) * 100;
    if (Math.abs(changePercent) < FLAT_THRESHOLD_PERCENT) return { trend: 'flat', changePercent };

    return { trend: changePercent > 0 ? 'rising' : 'falling', changePercent };
  }
}
