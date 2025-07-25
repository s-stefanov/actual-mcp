// Generates the markdown report for spending-by-category tool
import type { GroupSpending } from './types.js';
import { formatAmount } from '../../utils.js';

export class SpendingByCategoryReportGenerator {
  generate(
    sortedGroups: GroupSpending[],
    period: { start: string; end: string },
    accountLabel: string,
    includeIncome: boolean
  ): string {
    let markdown = `# Spending by Category\n\n`;
    markdown += `Period: ${period.start} to ${period.end}\n\n`;
    markdown += `${accountLabel}\n\n`;
    markdown += `Income categories: ${includeIncome ? 'Included' : 'Excluded'}\n\n`;
    sortedGroups.forEach((group) => {
      markdown += `## ${group.name}\n`;
      markdown += `Total: ${formatAmount(group.total)}\n\n`;
      markdown += `| Category | Amount | Transactions |\n`;
      markdown += `| -------- | ------ | ------------ |\n`;
      group.categories.forEach((category) => {
        markdown += `| ${category.name} | ${formatAmount(category.total)} | ${category.transactions} |\n`;
      });
      markdown += `\n`;
    });
    return markdown;
  }
}
