// Shapes the category-by-month matrix into the JSON payload for category-trends
import type { CategoryTrendRow, CategoryTrendsReportData } from './types.js';

export interface CategoryTrendsReport {
  amountsIn: string;
  months: string[];
  includeIncome: boolean;
  categories: CategoryTrendRow[];
  biggestMovers: CategoryTrendRow[];
}

const AMOUNTS_IN =
  'Integer cents, as positive magnitudes. `trend` compares the average of the second half of the period against the first half; `changePercent` is that change.';

const MOVER_LIMIT = 10;

export class CategoryTrendsReportBuilder {
  build(data: CategoryTrendsReportData): CategoryTrendsReport {
    return {
      amountsIn: AMOUNTS_IN,
      months: data.months,
      includeIncome: data.includeIncome,
      categories: data.rows,
      biggestMovers: this.movers(data.rows),
    };
  }

  private movers(rows: CategoryTrendRow[]): CategoryTrendRow[] {
    return rows
      .filter((row) => row.changePercent !== undefined && row.trend !== 'flat')
      .sort((a, b) => Math.abs(b.changePercent!) - Math.abs(a.changePercent!))
      .slice(0, MOVER_LIMIT);
  }
}
