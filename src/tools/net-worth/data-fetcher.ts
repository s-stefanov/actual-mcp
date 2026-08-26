// Fetches per-month account balances for net-worth tool
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import { getAccountBalance } from '../../actual-api.js';
import { endOfMonth } from '../../utils.js';
import type { Account } from '../../core/types/domain.js';
import type { AccountBalanceAtMonth } from './types.js';

export interface NetWorthFetchOptions {
  includeOffBudget: boolean;
  includeClosed: boolean;
}

export class NetWorthDataFetcher {
  /**
   * Fetch each account's balance as of the last day of every requested month.
   *
   * Reason: `getAccountBalance` resolves against Actual's own running balance,
   * which already accounts for transfers and starting balances. Replaying
   * transactions to derive the same figure would drift from what the app shows.
   */
  async fetchBalances(months: string[], options: NetWorthFetchOptions): Promise<Map<string, AccountBalanceAtMonth[]>> {
    const accounts = this.selectAccounts(await fetchAllAccounts(), options);
    const byMonth = new Map<string, AccountBalanceAtMonth[]>();

    for (const month of months) {
      const cutoff = endOfMonth(month);
      const balances = await Promise.all(
        accounts.map(async (account) => ({
          id: account.id,
          name: account.name,
          offBudget: Boolean(account.offbudget),
          balance: await getAccountBalance(account.id, cutoff),
        }))
      );
      byMonth.set(month, balances);
    }

    return byMonth;
  }

  private selectAccounts(accounts: Account[], options: NetWorthFetchOptions): Account[] {
    return accounts
      .filter((account) => options.includeClosed || !account.closed)
      .filter((account) => options.includeOffBudget || !account.offbudget);
  }
}
