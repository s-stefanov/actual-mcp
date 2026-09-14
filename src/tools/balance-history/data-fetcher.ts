// Fetches accounts, transactions, and balances for balance-history tool
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import { fetchAccountBalanceAsOf } from '../../core/data/fetch-account-balance.js';
import { fetchAllTransactions, fetchTransactionsForAccount } from '../../core/data/fetch-transactions.js';
import type { Account, Transaction } from '../../core/types/domain.js';

export class BalanceHistoryDataFetcher {
  async fetchAll(
    accountId: string | undefined,
    includeOffBudget: boolean,
    start: string,
    end: string,
    endDate: Date
  ): Promise<{
    account?: Account;
    accounts: Account[];
    transactions: Transaction[];
  }> {
    const allAccounts = await fetchAllAccounts();

    if (accountId) {
      const account = allAccounts.find((candidate) => candidate.id === accountId);
      if (!account) {
        throw new Error(`Account with ID ${accountId} not found`);
      }

      account.balance = await fetchAccountBalanceAsOf(account.id, endDate);
      const transactions = await fetchTransactionsForAccount(account.id, start, end);
      return { account, accounts: [account], transactions };
    }

    const accounts = allAccounts.filter((account) => includeOffBudget || !account.offbudget);
    const transactions = await fetchAllTransactions(accounts, start, end);
    for (const account of accounts) {
      account.balance = await fetchAccountBalanceAsOf(account.id, endDate);
    }

    return { accounts, transactions };
  }
}
