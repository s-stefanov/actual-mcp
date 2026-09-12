// Fetches transactions and accounts for spending-by-payee tool
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import { fetchAllOnBudgetTransactions, fetchTransactionsForAccount } from '../../core/data/fetch-transactions.js';
import type { Account, Transaction } from '../../core/types/domain.js';

export class SpendingByPayeeDataFetcher {
  async fetchAll(
    accountId: string | undefined,
    start: string,
    end: string
  ): Promise<{ transactions: Transaction[]; account: Account | undefined }> {
    const accounts = await fetchAllAccounts();

    if (accountId) {
      const account = accounts.find((a) => a.id === accountId);
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }
      return { transactions: await fetchTransactionsForAccount(accountId, start, end), account };
    }

    return { transactions: await fetchAllOnBudgetTransactions(accounts, start, end), account: undefined };
  }
}
