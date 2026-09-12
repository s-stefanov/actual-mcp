// Groups transactions by payee for spending-by-payee tool
import type { Transaction } from '../../core/types/domain.js';
import type { PayeeSpending } from './types.js';

export class PayeeAggregator {
  /**
   * Total spend (or income) per payee across the given transactions.
   *
   * Transfers are excluded: they move money between the user's own accounts
   * and would otherwise show up as large, meaningless "payees".
   */
  aggregate(transactions: Transaction[], includeIncome: boolean): PayeeSpending[] {
    const totals = new Map<string, PayeeSpending>();

    transactions
      .filter((transaction) => !transaction.transfer_id)
      .filter((transaction) => (includeIncome ? transaction.amount > 0 : transaction.amount < 0))
      .forEach((transaction) => {
        const id = transaction.payee ?? 'unknown';
        const name = transaction.payee_name ?? 'Unknown payee';

        const existing = totals.get(id) ?? { id, name, total: 0, transactions: 0, average: 0, share: 0 };
        existing.total += Math.abs(transaction.amount);
        existing.transactions += 1;
        totals.set(id, existing);
      });

    const grandTotal = [...totals.values()].reduce((sum, payee) => sum + payee.total, 0);

    return [...totals.values()]
      .map((payee) => ({
        ...payee,
        average: payee.transactions > 0 ? payee.total / payee.transactions : 0,
        share: grandTotal > 0 ? (payee.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }
}
