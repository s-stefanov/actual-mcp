import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../core/data/fetch-accounts.js', () => ({
  fetchAllAccounts: vi.fn(),
}));
vi.mock('../../core/data/fetch-account-balance.js', () => ({
  fetchAccountBalanceAsOf: vi.fn(),
}));
vi.mock('../../core/data/fetch-transactions.js', () => ({
  fetchAllTransactions: vi.fn(),
  fetchTransactionsForAccount: vi.fn(),
}));

import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import { fetchAccountBalanceAsOf } from '../../core/data/fetch-account-balance.js';
import { fetchAllTransactions, fetchTransactionsForAccount } from '../../core/data/fetch-transactions.js';
import type { Account } from '../../core/types/domain.js';
import { BalanceHistoryDataFetcher } from './data-fetcher.js';

const accounts: Account[] = [
  { id: 'checking', name: 'Checking' },
  { id: 'savings', name: 'Savings' },
  { id: 'loan', name: 'Loan', offbudget: true },
];
const start = '2026-01-01';
const end = '2026-03-31';
const endDate = new Date(2026, 2, 31);

describe('BalanceHistoryDataFetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAllAccounts).mockResolvedValue(accounts.map((account) => ({ ...account })));
    vi.mocked(fetchAllTransactions).mockResolvedValue([]);
    vi.mocked(fetchTransactionsForAccount).mockResolvedValue([]);
    vi.mocked(fetchAccountBalanceAsOf).mockResolvedValue(0);
  });

  it('excludes off-budget accounts from all-account reports by default', async () => {
    const result = await new BalanceHistoryDataFetcher().fetchAll(undefined, false, start, end, endDate);

    expect(result.accounts.map((account) => account.id)).toEqual(['checking', 'savings']);
    expect(fetchAllTransactions).toHaveBeenCalledWith(result.accounts, start, end);
    expect(fetchAccountBalanceAsOf).toHaveBeenCalledTimes(2);
  });

  it('includes off-budget accounts when requested', async () => {
    const result = await new BalanceHistoryDataFetcher().fetchAll(undefined, true, start, end, endDate);

    expect(result.accounts.map((account) => account.id)).toEqual(['checking', 'savings', 'loan']);
    expect(fetchAllTransactions).toHaveBeenCalledWith(result.accounts, start, end);
    expect(fetchAccountBalanceAsOf).toHaveBeenCalledTimes(3);
  });

  it('honors an explicitly requested off-budget account', async () => {
    const result = await new BalanceHistoryDataFetcher().fetchAll('loan', false, start, end, endDate);

    expect(result.account?.id).toBe('loan');
    expect(result.accounts.map((account) => account.id)).toEqual(['loan']);
    expect(fetchTransactionsForAccount).toHaveBeenCalledWith('loan', start, end);
    expect(fetchAccountBalanceAsOf).toHaveBeenCalledWith('loan', endDate);
  });

  it('rejects an unknown account before fetching transactions or balances', async () => {
    await expect(new BalanceHistoryDataFetcher().fetchAll('missing', false, start, end, endDate)).rejects.toThrow(
      'Account with ID missing not found'
    );

    expect(fetchAllTransactions).not.toHaveBeenCalled();
    expect(fetchTransactionsForAccount).not.toHaveBeenCalled();
    expect(fetchAccountBalanceAsOf).not.toHaveBeenCalled();
  });
});
