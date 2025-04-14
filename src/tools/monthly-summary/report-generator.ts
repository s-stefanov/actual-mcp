import { MonthlySummaryReportData } from "./types.js";
import { formatAmount } from "../../utils.js";

export class MonthlySummaryReportGenerator {
  generate(data: MonthlySummaryReportData): string {
    const {
      start,
      end,
      accountId,
      accountName,
      sortedMonths,
      avgIncome,
      avgExpenses,
      avgInvestments,
      avgTraditionalSavings,
      avgTotalSavings,
      avgTraditionalSavingsRate,
      avgTotalSavingsRate,
    } = data;

    let markdown: string = `# Monthly Financial Summary\n\n`;
    markdown += `Period: ${start} to ${end}\n\n`;

    if (accountId) {
      markdown += `Account: ${accountName || accountId}\n\n`;
    } else {
      markdown += `Accounts: All on-budget accounts\n\n`;
    }

    // Add summary table
    markdown += `## Monthly Breakdown\n\n`;
    markdown += `| Month | Income | Regular Expenses | Investments | Traditional Savings | Total Savings | Total Savings Rate |\n`;
    markdown += `| ----- | ------ | ---------------- | ----------- | ------------------- | ------------- | ------------------ |\n`;

    sortedMonths.forEach((month: any) => {
      const monthName: string = new Date(
        month.year,
        month.month - 1,
        1
      ).toLocaleString("default", { month: "long" });
      const income: string = formatAmount(month.income);
      const expenses: string = formatAmount(month.expenses);
      const investments: string = formatAmount(month.investments);

      const traditionalSavings: number = month.income - month.expenses;
      const totalSavings: number = traditionalSavings + month.investments;

      const savingsFormatted: string = formatAmount(traditionalSavings);
      const totalSavingsFormatted: string = formatAmount(totalSavings);

      const savingsRate: string =
        month.income > 0
          ? ((totalSavings / month.income) * 100).toFixed(1) + "%"
          : "N/A";

      markdown += `| ${monthName} ${month.year} | ${income} | ${expenses} | ${investments} | ${savingsFormatted} | ${totalSavingsFormatted} | ${savingsRate} |\n`;
    });

    // Add averages
    markdown += `\n## Averages\n\n`;
    markdown += `Average Monthly Income: ${formatAmount(avgIncome)}\n`;
    markdown += `Average Monthly Regular Expenses: ${formatAmount(
      avgExpenses
    )}\n`;
    markdown += `Average Monthly Investments: ${formatAmount(
      avgInvestments
    )}\n`;
    markdown += `Average Monthly Traditional Savings: ${formatAmount(
      avgTraditionalSavings
    )}\n`;
    markdown += `Average Monthly Total Savings: ${formatAmount(
      avgTotalSavings
    )}\n`;
    markdown += `Average Traditional Savings Rate: ${avgTraditionalSavingsRate.toFixed(
      1
    )}%\n`;
    markdown += `Average Total Savings Rate: ${avgTotalSavingsRate.toFixed(
      1
    )}%\n`;

    markdown += `\n## Definitions\n\n`;
    markdown += `* **Traditional Savings**: Income minus regular expenses (excluding investments)\n`;
    markdown += `* **Total Savings**: Traditional savings plus investments\n`;

    return markdown;
  }
}
