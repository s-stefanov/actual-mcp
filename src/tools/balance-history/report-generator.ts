// Generates the markdown report for balance-history tool
import { formatAmount } from '../../utils.js';
import type { Account } from '../../types.js';
import type { MonthBalance } from './balance-calculator.js';

export class BalanceHistoryReportGenerator {
  generate(account: Account, period: { start: string; end: string }, sortedMonths: MonthBalance[]): string {
    let markdown = `# Account Balance History\n\n`;
    markdown += `Account: ${account.name}\n`;
    markdown += `Period: ${period.start} to ${period.end}\n\n`;

    // Add balance history table
    markdown += `| Month | End of Month Balance | Monthly Change | Transactions |\n`;
    markdown += `| ----- | -------------------- | -------------- | ------------ |\n`;

    let previousBalance: number | null = null;

    sortedMonths.forEach((month) => {
      const monthName: string = new Date(month.year, month.month - 1, 1).toLocaleString('default', { month: 'long' });
      const balance: string = formatAmount(month.balance);

      let change = '';
      let changeAmount = 0;

      if (previousBalance !== null) {
        changeAmount = month.balance - previousBalance;
        const changeFormatted: string = formatAmount(changeAmount);
        const direction: string = changeAmount > 0 ? '↑' : changeAmount < 0 ? '↓' : '';
        change = `${direction} ${changeFormatted}`;
      }

      previousBalance = month.balance;

      markdown += `| ${monthName} ${month.year} | ${balance} | ${change} | ${month.transactions} |\n`;
    });

    return markdown;
  }
}
