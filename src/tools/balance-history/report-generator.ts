// Generates the markdown report for balance-history tool
import { formatAmount } from "../../utils.js";
import type { Account } from "../../types.js";
import type { MonthBalance } from "./balance-calculator.js";

export class BalanceHistoryReportGenerator {
  generate(
    account: Account | undefined,
    period: { start: string; end: string },
    sortedMonths: MonthBalance[]
  ): string {
    let markdown: string = `# Balance History\n\n`;
    if (account) {
      markdown += `Account: ${account.name}\n`;
    }
    markdown += `Period: ${period.start} to ${period.end}\n\n`;

    // Add balance history table
    if (account) {
      markdown += `| Month | End of Month Balance | Monthly Change | Transactions |\n`;
      markdown += `| ----- | -------------------- | -------------- | ------------ |\n`;
    } else {
      markdown += `| Account | End of Month Balance | Monthly Change | Transactions |\n`;
      markdown += `| ------- | -------------------- | -------------- | ------------ |\n`;
    }

    let previousMonth: string = "";

    sortedMonths.forEach((month) => {
      const accountName = month.account;
      const monthName: string = new Date(
        month.year,
        month.month - 1,
        1
      ).toLocaleString("default", { month: "long" });
      const balance: string = formatAmount(month.balance);

      let change: string = "";

      const changeFormatted: string = formatAmount(month.change);
      const direction: string =
        month.change! > 0 ? "↑" : month.change! < 0 ? "↓" : "";
      change = `${direction} ${changeFormatted}`;

      if (account) {
        markdown += `| ${monthName} ${month.year} | ${balance} | ${change} | ${month.transactions} |\n`;
      } else {
        if (monthName != previousMonth) {
          previousMonth = monthName;
          markdown += `| ${monthName} ${month.year} |\n`;
        }
        markdown += `${accountName} | ${balance} | ${change} | ${month.transactions} |\n`;
      }
    });

    return markdown;
  }
}
