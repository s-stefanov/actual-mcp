// Fetches transactions and related data for get-transactions tool
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import { fetchAllTransactions, fetchTransactionsForAccount } from '../../core/data/fetch-transactions.js';
import type { Transaction } from '../../core/types/domain.js';

export class GetTransactionsDataFetcher {
  async fetch(accountId: string | undefined, start: string, end: string): Promise<Transaction[]> {
    if (accountId) {
      return await fetchTransactionsForAccount(accountId, start, end);
    }
    const accounts = await fetchAllAccounts();
    // ponytail: fetchAllTransactions fetches per account serially; parallelize if
    // cross-account latency matters for large budgets.
    return await fetchAllTransactions(accounts, start, end);
  }
}
