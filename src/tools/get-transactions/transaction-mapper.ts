// Maps and formats transaction data for get-transactions tool
import { formatAmount, formatDate } from '../../utils.js';
import type { Transaction } from '../../types.js';

export interface MappedTransaction {
  id: string;
  date: string;
  payee: string;
  category: string;
  amount: string;
  notes: string;
  cleared: boolean;
  transferId: string;
  // Reason: A split's subtransactions are one level deep in Actual's model, so this is not
  // recursive — a subtransaction row never has its own subtransactions.
  subtransactions?: Omit<MappedTransaction, 'subtransactions'>[];
}

export class GetTransactionsMapper {
  map(transactions: Transaction[]): MappedTransaction[] {
    return transactions.map((t) => this._mapOne(t));
  }

  private _mapOne(t: Transaction): MappedTransaction {
    return {
      id: t.id,
      date: formatDate(t.date),
      payee: t.payee_name || t.payee || '(No payee)',
      category: t.category_name || t.category || '(Uncategorized)',
      amount: formatAmount(t.amount),
      notes: t.notes || '',
      cleared: t.cleared ?? false,
      transferId: t.transfer_id || '',
      ...(t.subtransactions ? { subtransactions: t.subtransactions.map((sub) => this._mapOne(sub)) } : {}),
    };
  }
}
