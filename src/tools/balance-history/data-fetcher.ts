// Fetches accounts, transactions, and balances for balance-history tool
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import { fetchAllTransactions, fetchTransactionsForAccount } from '../../core/data/fetch-transactions.js';
import type { Account, Transaction } from '../../core/types/domain.js';
import { getAccountBalance } from '../../actual-api.js';

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
      account.balance = await getAccountBalance(accountId, new Date('2099-01-01'));
    } else {
      transactions = await fetchAllTransactions(accounts, start, end);
      for (const a of accounts) {
        a.balance = await getAccountBalance(a.id, new Date('2099-01-01'));
      }
    }

    return { account, accounts, transactions };
  }
}
