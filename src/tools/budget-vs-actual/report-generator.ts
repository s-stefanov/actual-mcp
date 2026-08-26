// Generates the markdown report for budget-vs-actual tool
import { formatAmount, formatMonthLabel } from '../../utils.js';
import type { BudgetVsActualReportData, CategoryBudgetRow, MonthBudgetReport } from './types.js';

export class BudgetVsActualReportGenerator {
  generate(data: BudgetVsActualReportData): string {
    let markdown = `# Budget vs Actual\n\n`;

    if (data.categoryGroupName) {
      markdown += `Category group: ${data.categoryGroupName}\n\n`;
    }

    if (data.months.length === 0) {
      markdown += `No budget data available for the requested months.\n`;
      return markdown;
    }

    data.months.forEach((month) => {
      markdown += this.renderMonth(month);
    });

    markdown += this.renderOverspending(data.months);

    if (data.missingMonths.length > 0) {
      markdown += `\n## Months Without Budget Data\n\n`;
      markdown += `${data.missingMonths.map(formatMonthLabel).join(', ')}\n`;
    }

    markdown += `\n## Definitions\n\n`;
    markdown += `* **Budgeted**: Amount allocated to the category for the month\n`;
    markdown += `* **Spent**: Money that left the category during the month, as a positive amount\n`;
    markdown += `* **Balance**: What remains in the category, including any carryover from earlier months\n`;
    markdown += `* **To Budget**: Income not yet allocated to any category\n`;

    return markdown;
  }

  private renderMonth(month: MonthBudgetReport): string {
    let markdown = `## ${formatMonthLabel(month.month)}\n\n`;
    markdown += `To Budget: ${formatAmount(month.toBudget)}\n\n`;
    markdown += `| Category | Budgeted | Spent | Balance | Used |\n`;
    markdown += `| -------- | -------- | ----- | ------- | ---- |\n`;

    month.groups.forEach((group) => {
      markdown += `| **${group.name}** | ${formatAmount(group.budgeted)} | ${formatAmount(group.spent)} | ${formatAmount(group.balance)} | ${this.percentUsed(group.budgeted, group.spent)} |\n`;
      group.categories.forEach((category) => {
        const carryover = category.carryover ? ' ↷' : '';
        markdown += `| ${category.name}${carryover} | ${formatAmount(category.budgeted)} | ${formatAmount(category.spent)} | ${formatAmount(category.balance)} | ${this.percentUsed(category.budgeted, category.spent)} |\n`;
      });
    });

    return markdown + `\n`;
  }

  private renderOverspending(months: MonthBudgetReport[]): string {
    const overspent: Array<CategoryBudgetRow & { month: string }> = months.flatMap((month) =>
      month.groups.flatMap((group) =>
        group.categories
          .filter((category) => category.balance < 0)
          .map((category) => ({ ...category, month: month.month }))
      )
    );

    if (overspent.length === 0) {
      return `## Overspending\n\nNo categories are overspent in this period.\n`;
    }

    overspent.sort((a, b) => a.balance - b.balance);

    let markdown = `## Overspending\n\n`;
    markdown += `| Month | Category | Group | Over By |\n`;
    markdown += `| ----- | -------- | ----- | ------- |\n`;
    overspent.slice(0, 20).forEach((category) => {
      markdown += `| ${formatMonthLabel(category.month)} | ${category.name} | ${category.group} | ${formatAmount(Math.abs(category.balance))} |\n`;
    });

    return markdown;
  }

  private percentUsed(budgeted: number, spent: number): string {
    if (budgeted <= 0) return 'N/A';
    return `${((spent / budgeted) * 100).toFixed(0)}%`;
  }
}
