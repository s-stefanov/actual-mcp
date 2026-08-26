// Generates the markdown report for net-worth tool
import { formatAmount, formatMonthLabel } from '../../utils.js';
import type { NetWorthReportData } from './types.js';

export class NetWorthReportGenerator {
  generate(data: NetWorthReportData): string {
    let markdown = `# Net Worth\n\n`;
    markdown += `Accounts: ${data.includeOffBudget ? 'All accounts' : 'On-budget accounts only'}`;
    markdown += data.includeClosed ? ', including closed\n\n' : '\n\n';

    if (data.months.length === 0) {
      markdown += `No accounts matched the requested filters.\n`;
      return markdown;
    }

    markdown += `| Month | Assets | Liabilities | Net Worth | Change |\n`;
    markdown += `| ----- | ------ | ----------- | --------- | ------ |\n`;

    data.months.forEach((month) => {
      const change =
        month.change === undefined
          ? '—'
          : `${month.change > 0 ? '↑' : month.change < 0 ? '↓' : ''} ${formatAmount(Math.abs(month.change))}`;
      markdown += `| ${formatMonthLabel(month.month)} | ${formatAmount(month.assets)} | ${formatAmount(month.liabilities)} | ${formatAmount(month.netWorth)} | ${change} |\n`;
    });

    markdown += this.renderPeriodChange(data);
    markdown += this.renderLatestBreakdown(data);

    return markdown;
  }

  private renderPeriodChange(data: NetWorthReportData): string {
    const first = data.months[0];
    const last = data.months[data.months.length - 1];
    if (data.months.length < 2) return '';

    const delta = last.netWorth - first.netWorth;
    const direction = delta >= 0 ? 'up' : 'down';
    let markdown = `\n## Period Change\n\n`;
    markdown += `Net worth is ${direction} ${formatAmount(Math.abs(delta))} `;
    markdown += `from ${formatMonthLabel(first.month)} to ${formatMonthLabel(last.month)}.\n`;

    if (first.netWorth !== 0) {
      const percent = (delta / Math.abs(first.netWorth)) * 100;
      markdown += `That is a change of ${percent.toFixed(1)}%.\n`;
    }

    return markdown;
  }

  private renderLatestBreakdown(data: NetWorthReportData): string {
    const last = data.months[data.months.length - 1];
    if (last.accounts.length === 0) return '';

    const sorted = [...last.accounts].sort((a, b) => b.balance - a.balance);

    let markdown = `\n## Account Breakdown — ${formatMonthLabel(last.month)}\n\n`;
    markdown += `| Account | Balance | On/Off Budget |\n`;
    markdown += `| ------- | ------- | ------------- |\n`;
    sorted.forEach((account) => {
      markdown += `| ${account.name} | ${formatAmount(account.balance)} | ${account.offBudget ? 'Off budget' : 'On budget'} |\n`;
    });

    return markdown;
  }
}
