// Generates the markdown report for cash-flow tool
import { formatAmount } from '../../utils.js';
import type { CashFlowReportData } from './types.js';

export class CashFlowReportGenerator {
  generate(data: CashFlowReportData): string {
    let markdown = `# Cash Flow\n\n`;
    markdown += `Period: ${data.start} to ${data.end}\n`;
    markdown += `Interval: ${data.interval === 'monthly' ? 'Monthly' : 'Weekly'}\n`;
    markdown += `Account: ${data.accountName ?? 'All on-budget accounts'}\n\n`;

    if (data.periods.length === 0) {
      markdown += `No transactions in this period.\n`;
      return markdown;
    }

    markdown += `| Period | Income | Expenses | Net | Running Net | Transactions |\n`;
    markdown += `| ------ | ------ | -------- | --- | ----------- | ------------ |\n`;

    data.periods.forEach((period) => {
      const direction = period.net > 0 ? '↑' : period.net < 0 ? '↓' : '';
      markdown += `| ${period.label} | ${formatAmount(period.income)} | ${formatAmount(period.expenses)} | ${direction} ${formatAmount(Math.abs(period.net))} | ${formatAmount(period.runningNet)} | ${period.transactions} |\n`;
    });

    markdown += this.renderSummary(data);

    markdown += `\n## Notes\n\n`;
    markdown += `* Transfers between your own accounts are excluded\n`;
    markdown += `* **Running Net** is the cumulative net across the reported periods, not an account balance\n`;

    return markdown;
  }

  private renderSummary(data: CashFlowReportData): string {
    const totalIncome = data.periods.reduce((sum, period) => sum + period.income, 0);
    const totalExpenses = data.periods.reduce((sum, period) => sum + period.expenses, 0);
    const net = totalIncome - totalExpenses;
    const negativePeriods = data.periods.filter((period) => period.net < 0);

    let markdown = `\n## Summary\n\n`;
    markdown += `Total Income: ${formatAmount(totalIncome)}\n`;
    markdown += `Total Expenses: ${formatAmount(totalExpenses)}\n`;
    markdown += `Net: ${formatAmount(net)}\n`;
    markdown += `Average Net per Period: ${formatAmount(net / data.periods.length)}\n`;
    markdown += `Periods Spending More Than Earned: ${negativePeriods.length} of ${data.periods.length}\n`;

    return markdown;
  }
}
