// Fetches transactions and related data for get-transactions tool
import { getTransactions } from "../../actual-api.js";
import type { Transaction } from "../../types.js";

export class GetTransactionsDataFetcher {
  async fetch(
    accountId: string,
    start: string,
    end: string
  ): Promise<Transaction[]> {
    return await getTransactions(accountId, start, end);
  }
}
