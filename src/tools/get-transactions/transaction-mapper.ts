// Maps and formats transaction data for get-transactions tool
import { formatAmount, formatDate } from "../../utils.js";
import type { Transaction } from "../../types.js";

export class GetTransactionsMapper {
  map(transactions: Transaction[]) {
    // TODO: Payee and category are not visible in the transaction object
    return transactions.map((t) => ({
      date: formatDate(t.date),
      payee: t.payee || "(No payee)",
      category: t.category || "(Uncategorized)",
      amount: formatAmount(t.amount),
      notes: t.notes || "",
    }));
  }
}
