import { getTransactions } from "../../actual-api.js";
import type { Account, Transaction } from "../types/domain.js";

export async function fetchTransactionsForAccount(
  accountId: string,
  start: string,
  end: string
): Promise<Transaction[]> {
  return getTransactions(accountId, start, end);
}

export async function fetchAllOnBudgetTransactions(
  accounts: Account[],
  start: string,
  end: string
): Promise<Transaction[]> {
  let transactions: Transaction[] = [];
  const onBudgetAccounts = accounts.filter((a) => !a.offbudget && !a.closed);
  for (const account of onBudgetAccounts) {
    const tx = await getTransactions(account.id, start, end);
    transactions = [...transactions, ...tx];
  }
  return transactions;
}
