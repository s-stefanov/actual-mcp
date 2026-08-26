// Generates the markdown report for spending-by-payee tool
import { formatAmount } from '../../utils.js';
import type { SpendingByPayeeReportData } from './types.js';

export class SpendingByPayeeReportGenerator {
  generate(data: SpendingByPayeeReportData): string {
    const heading = data.includeIncome ? 'Income by Payee' : 'Spending by Payee';

    let markdown = `# ${heading}\n\n`;
    markdown += `Period: ${data.start} to ${data.end}\n`;
    markdown += `Account: ${data.accountName ?? 'All on-budget accounts'}\n\n`;

    if (data.payees.length === 0) {
      markdown += `No matching transactions in this period.\n`;
      return markdown;
    }

    markdown += `| Payee | Total | Transactions | Average | Share |\n`;
    markdown += `| ----- | ----- | ------------ | ------- | ----- |\n`;

    data.payees.forEach((payee) => {
      markdown += `| ${payee.name} | ${formatAmount(payee.total)} | ${payee.transactions} | ${formatAmount(payee.average)} | ${payee.share.toFixed(1)}% |\n`;
    });

    markdown += `\n## Totals\n\n`;
    markdown += `Listed payees: ${data.payees.length} of ${data.totalListed}\n`;
    markdown += `Total ${data.includeIncome ? 'received' : 'spent'}: ${formatAmount(data.grandTotal)}\n`;

    markdown += `\n## Notes\n\n`;
    markdown += `* Transfers between your own accounts are excluded\n`;
    markdown += `* **Share** is the payee's percentage of the total above\n`;

    return markdown;
  }
}
