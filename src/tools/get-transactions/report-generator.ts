// Generates the response/report for get-transactions tool

export class GetTransactionsReportGenerator {
  generate(
    mappedTransactions: Array<{
      id: string;
      date: string;
      payee: string;
      category: string;
      amount: string;
      notes: string;
      cleared: boolean;
    }>,
    filterDescription: string,
    filteredCount: number,
    totalCount: number
  ): string {
    const header =
      '| ID | Date | Payee | Category | Amount | Cleared | Notes |\n| ---- | ----- | -------- | ------ | ----- | ------- | ----- |\n';
    const rows = mappedTransactions
      .map((t) => `| ${t.id} | ${t.date} | ${t.payee} | ${t.category} | ${t.amount} | ${t.cleared} | ${t.notes} |`)
      .join('\n');
    return `# Filtered Transactions\n\n${filterDescription}\nMatching Transactions: ${filteredCount}/${totalCount}\n\n${header}${rows}`;
  }
}
