// Fetches accounts, transactions, and balances for balance-history tool
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import { fetchAccountBalanceAsOf } from '../../core/data/fetch-account-balance.js';
import { fetchAllTransactions, fetchTransactionsForAccount } from '../../core/data/fetch-transactions.js';
import type { Account, Transaction } from '../../core/types/domain.js';

export class BalanceHistoryDataFetcher {
  async fetchAll(
    accountId: string | undefined,
    start: string,
    end: string
  ): Promise<{
    account: Account | undefined;
    accounts: Account[];
    transactions: Transaction[];
  }> {
    const accounts = await fetchAllAccounts();
    const account = accounts.find((a) => a.id === accountId);

    let transactions: Transaction[] = [];
    if (accountId && account) {
      transactions = await fetchTransactionsForAccount(accountId, start, end);
      account.balance = await fetchAccountBalanceAsOf(accountId, new Date(end));
    } else {
      transactions = await fetchAllTransactions(accounts, start, end);
      for (const a of accounts) {
        a.balance = await fetchAccountBalanceAsOf(a.id, new Date(end));
      }
    }

    return { account, accounts, transactions };
  }
}
