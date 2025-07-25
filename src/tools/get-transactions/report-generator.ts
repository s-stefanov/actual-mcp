// Generates the response/report for get-transactions tool

export class GetTransactionsReportGenerator {
  generate(
    mappedTransactions: Array<{
      date: string;
      payee: string;
      category: string;
      amount: string;
      notes: string;
    }>,
    filterDescription: string,
    filteredCount: number,
    totalCount: number
  ): string {
    const header = '| Date | Payee | Category | Amount | Notes |\n| ---- | ----- | -------- | ------ | ----- |\n';
    const rows = mappedTransactions
      .map((t) => `| ${t.date} | ${t.payee} | ${t.category} | ${t.amount} | ${t.notes} |`)
      .join('\n');
    return `# Filtered Transactions\n\n${filterDescription}\nMatching Transactions: ${filteredCount}/${totalCount}\n\n${header}${rows}`;
  }
}
