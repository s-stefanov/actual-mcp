import { MonthlySummaryReportData } from './types.js';
import { formatAmount } from '../../utils.js';

export class MonthlySummaryReportGenerator {
  generate(data: MonthlySummaryReportData): string {
    const { start, end, accountId, accountName, sortedMonths, avgIncome, avgExpenses, avgSavings, avgSavingsRate } =
      data;

    let markdown = `# Monthly Financial Summary\n\n`;
    markdown += `Period: ${start} to ${end}\n\n`;

    if (accountId) {
      markdown += `Account: ${accountName || accountId}\n\n`;
    } else {
      markdown += `Accounts: All on-budget accounts\n\n`;
    }

    markdown += `## Monthly Breakdown\n\n`;
    markdown += `| Month | Income | Expenses | Savings | Savings Rate |\n`;
    markdown += `| ----- | ------ | -------- | ------- | ------------ |\n`;

    sortedMonths.forEach((month) => {
      const monthName = new Date(month.year, month.month - 1, 1).toLocaleString('default', { month: 'long' });
      const savings = month.income - month.expenses;
      const savingsRate = month.income > 0 ? (savings / month.income) * 100 : 0;

      markdown += `| ${monthName} ${month.year} | ${formatAmount(month.income)} | ${formatAmount(month.expenses)} | ${formatAmount(savings)} | ${savingsRate.toFixed(1)}% |\n`;
    });

    markdown += `\n## Averages\n\n`;
    markdown += `Average Monthly Income: ${formatAmount(avgIncome)}\n`;
    markdown += `Average Monthly Expenses: ${formatAmount(avgExpenses)}\n`;
    markdown += `Average Monthly Savings: ${formatAmount(avgSavings)}\n`;
    markdown += `Average Savings Rate: ${avgSavingsRate.toFixed(1)}%\n`;

    return markdown;
  }
}
