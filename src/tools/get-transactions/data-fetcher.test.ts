import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../core/data/fetch-accounts.js', () => ({
  fetchAllAccounts: vi.fn(),
}));
vi.mock('../../core/data/fetch-transactions.js', () => ({
  fetchAllTransactions: vi.fn(),
  fetchTransactionsForAccount: vi.fn(),
}));

import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import { fetchAllTransactions, fetchTransactionsForAccount } from '../../core/data/fetch-transactions.js';
import type { Account } from '../../core/types/domain.js';
import { GetTransactionsDataFetcher } from './data-fetcher.js';

const accounts: Account[] = [
  { id: 'checking', name: 'Checking' },
  { id: 'loan', name: 'Loan', offbudget: true },
];
const start = '2026-01-01';
const end = '2026-03-31';

describe('GetTransactionsDataFetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAllAccounts).mockResolvedValue(accounts);
    vi.mocked(fetchAllTransactions).mockResolvedValue([]);
    vi.mocked(fetchTransactionsForAccount).mockResolvedValue([]);
  });

  it('fetches a single account when accountId is provided', async () => {
    await new GetTransactionsDataFetcher().fetch('checking', start, end);

    expect(fetchTransactionsForAccount).toHaveBeenCalledWith('checking', start, end);
    expect(fetchAllTransactions).not.toHaveBeenCalled();
  });

  it('fetches across all accounts, including off-budget, when accountId is omitted', async () => {
    await new GetTransactionsDataFetcher().fetch(undefined, start, end);

    expect(fetchAllTransactions).toHaveBeenCalledWith(accounts, start, end);
    expect(fetchTransactionsForAccount).not.toHaveBeenCalled();
  });
});
