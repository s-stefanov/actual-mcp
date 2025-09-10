// Maps and formats transaction data for get-transactions tool
import { formatAmount, formatDate } from '../../utils.js';
import type { Transaction } from '../../types.js';

export class GetTransactionsMapper {
  map(transactions: Transaction[]): Array<{
    date: string;
    payee: string;
    category: string;
    amount: string;
    notes: string;
  }> {
    // TODO: Payee and category are not visible in the transaction object
    return transactions.map((t) => ({
      date: formatDate(t.date),
      payee: t.payee || '(No payee)',
      category: t.category_name || '(Uncategorized)',
      amount: formatAmount(t.amount),
      notes: t.notes || '',
    }));
  }
}
