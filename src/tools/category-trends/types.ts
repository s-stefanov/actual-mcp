// Types/interfaces for category-trends tool

export type TrendDirection = 'rising' | 'falling' | 'flat';

export interface CategoryTrendRow {
  id: string;
  name: string;
  group: string;
  amountsByMonth: Record<string, number>;
  total: number;
  average: number;
  min: number;
  max: number;
  trend: TrendDirection;
  changePercent?: number;
}

export interface CategoryTrendsReportData {
  months: string[];
  rows: CategoryTrendRow[];
  includeIncome: boolean;
}
