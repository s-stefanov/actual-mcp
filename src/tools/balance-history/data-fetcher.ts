// Fetches accounts, transactions, and balances for balance-history tool
import { getAccounts, getTransactions } from "../../actual-api.js";
import type { Account, Transaction } from "../../types.js";
import api from "@actual-app/api";

export class BalanceHistoryDataFetcher {
  async fetchAll(accountId: string, start: string, end: string): Promise<{
    accounts: Account[];
    account: Account | undefined;
    transactions: Transaction[];
    currentBalance: number;
  }> {
    const accounts = await getAccounts();
    const account = accounts.find((a) => a.id === accountId);
    const transactions = await getTransactions(accountId, start, end);
    const currentBalance = await api.getAccountBalance(accountId);
    return { accounts, account, transactions, currentBalance };
  }
}
