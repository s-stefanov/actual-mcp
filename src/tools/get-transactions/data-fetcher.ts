// Fetches transactions and related data for get-transactions tool
import { fetchTransactionsForAccount } from '../../core/data/fetch-transactions.js';
import type { Transaction } from '../../core/types/domain.js';

export class GetTransactionsDataFetcher {
  async fetch(accountId: string, start: string, end: string): Promise<Transaction[]> {
    return await fetchTransactionsForAccount(accountId, start, end);
  }
}
