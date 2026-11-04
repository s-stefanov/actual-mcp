// Generates the response/report for get-transactions tool
import type { Transaction } from '../../core/types/domain.js';
import type { PayeeCategoryHistory } from './data-fetcher.js';
import type { MappedTransaction } from './transaction-mapper.js';

export class GetTransactionsReportGenerator {
  /**
   * Renders each payee's past categories as a section to append after the table. Payee names
   * come from the transactions themselves (including split lines).
   */
  generatePayeeHistory(history: Record<string, PayeeCategoryHistory[]>, transactions: Transaction[]): string {
    const payeeNames = new Map<string, string>();
    for (const t of transactions) {
      for (const line of [t, ...(t.subtransactions ?? [])]) {
        if (line.payee && !payeeNames.has(line.payee)) payeeNames.set(line.payee, line.payee_name || line.payee);
      }
    }
    if (payeeNames.size === 0) {
      return '';
    }

    const lines = [...payeeNames].map(([id, name]) => {
      const past = history[id] ?? [];
      const summary = past.length
        ? past.map((h) => `${h.category_name} (${h.count}, id ${h.category})`).join(', ')
        : 'no past categories';
      return `- ${name}: ${summary}`;
    });
    return `\n\n## Past Categories by Payee\n\n${lines.join('\n')}`;
  }

  generate(
    mappedTransactions: MappedTransaction[],
    filterDescription: string,
    filteredCount: number,
    totalCount: number
  ): string {
    const header =
      '| ID | Date | Payee | Category | Amount | Cleared | Notes | Transfer |\n| ---- | ----- | -------- | ------ | ----- | ------- | ----- | -------- |\n';
    const rows = mappedTransactions.flatMap((t) => this._rowsFor(t)).join('\n');
    return `# Filtered Transactions\n\n${filterDescription}\nMatching Transactions: ${filteredCount}/${totalCount}\n\n${header}${rows}`;
  }

  // Reason: A split's subtransactions are rendered as extra rows right under their parent
  // (id prefixed with "↳") so a subtransaction's id — needed to target it with
  // update-transaction, e.g. to turn one leg into a transfer — is visible without adding a
  // second table or changing the column count consumers already parse.
  private _rowsFor(t: MappedTransaction): string[] {
    const parentRow = `| ${t.id} | ${t.date} | ${t.payee} | ${t.category} | ${t.amount} | ${t.cleared} | ${t.notes} | ${t.transferId} |`;
    const subRows = (t.subtransactions ?? []).map(
      (sub) =>
        `| ↳ ${sub.id} | ${sub.date} | ${sub.payee} | ${sub.category} | ${sub.amount} | ${sub.cleared} | ${sub.notes} | ${sub.transferId} |`
    );
    return [parentRow, ...subRows];
  }
}
