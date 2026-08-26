// Generates the markdown report for category-trends tool
import { formatAmount, formatMonthLabel } from '../../utils.js';
import type { CategoryTrendRow, CategoryTrendsReportData, TrendDirection } from './types.js';

const TREND_MARKER: Record<TrendDirection, string> = {
  rising: '↑',
  falling: '↓',
  flat: '→',
};

export class CategoryTrendsReportGenerator {
  generate(data: CategoryTrendsReportData): string {
    let markdown = `# Category Trends\n\n`;
    markdown += `Period: ${formatMonthLabel(data.months[0])} to ${formatMonthLabel(data.months[data.months.length - 1])}\n`;
    markdown += `Categories: ${data.includeIncome ? 'Income and expenses' : 'Expenses only'}\n\n`;

    if (data.rows.length === 0) {
      markdown += `No categories with activity matched the requested filters.\n`;
      return markdown;
    }

    const header = data.months.map((month) => formatMonthLabel(month)).join(' | ');
    const divider = data.months.map(() => '---').join(' | ');

    markdown += `| Category | Group | ${header} | Average | Trend |\n`;
    markdown += `| -------- | ----- | ${divider} | ------- | ----- |\n`;

    data.rows.forEach((row) => {
      const cells = data.months.map((month) => formatAmount(row.amountsByMonth[month] ?? 0)).join(' | ');
      markdown += `| ${row.name} | ${row.group} | ${cells} | ${formatAmount(row.average)} | ${this.renderTrend(row)} |\n`;
    });

    markdown += this.renderMovers(data.rows);

    markdown += `\n## Definitions\n\n`;
    markdown += `* **Trend**: Average of the second half of the period compared against the first half\n`;
    markdown += `* Amounts are magnitudes, so a larger number always means more money moved\n`;

    return markdown;
  }

  private renderTrend(row: CategoryTrendRow): string {
    const marker = TREND_MARKER[row.trend];
    if (row.changePercent === undefined) return marker;
    return `${marker} ${row.changePercent > 0 ? '+' : ''}${row.changePercent.toFixed(0)}%`;
  }

  private renderMovers(rows: CategoryTrendRow[]): string {
    const withChange = rows.filter((row) => row.changePercent !== undefined && row.trend !== 'flat');
    if (withChange.length === 0) return '';

    const sorted = [...withChange].sort((a, b) => Math.abs(b.changePercent!) - Math.abs(a.changePercent!));

    let markdown = `\n## Biggest Movers\n\n`;
    markdown += `| Category | Change | Average |\n`;
    markdown += `| -------- | ------ | ------- |\n`;
    sorted.slice(0, 10).forEach((row) => {
      markdown += `| ${row.name} | ${this.renderTrend(row)} | ${formatAmount(row.average)} |\n`;
    });

    return markdown;
  }
}
