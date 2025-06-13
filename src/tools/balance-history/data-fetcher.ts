// Fetches accounts, transactions, and balances for balance-history tool
import { fetchAllAccounts } from "../../core/data/fetch-accounts.js";
import { fetchTransactionsForAccount } from "../../core/data/fetch-transactions.js";
import type { Account, Transaction } from "../../core/types/domain.js";
import api from "@actual-app/api";

export class BalanceHistoryDataFetcher {
  async fetchAll(
    accountId: string,
    start: string,
    end: string
  ): Promise<{
    accounts: Account[];
    account: Account | undefined;
    transactions: Transaction[];
    currentBalance: number;
  }> {
    const accounts = await fetchAllAccounts();
    const account = accounts.find((a) => a.id === accountId);
    const transactions = await fetchTransactionsForAccount(
      accountId,
      start,
      end
    );
    const currentBalance = await api.getAccountBalance(accountId);
    return { accounts, account, transactions, currentBalance };
  }
}
