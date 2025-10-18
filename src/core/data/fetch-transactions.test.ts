import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Account } from '../types/domain.js';

vi.mock('../../actual-api.js', () => ({
  getTransactions: vi.fn(),
}));

vi.mock('./fetch-payees.js', () => ({
  fetchAllPayees: vi.fn(),
}));

vi.mock('./fetch-categories.js', () => ({
  fetchAllCategories: vi.fn(),
}));

import {
  fetchTransactionsForAccount,
  fetchAllOnBudgetTransactions,
  fetchAllTransactions,
} from './fetch-transactions.js';
import { getTransactions } from '../../actual-api.js';
import { fetchAllPayees } from './fetch-payees.js';
import { fetchAllCategories } from './fetch-categories.js';

describe('fetchTransactionsForAccount', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return transactions for specific account with populated names', async () => {
    const mockTransactions = [
      {
        id: '1',
        account: 'acc1',
        date: '2023-01-01',
        amount: -100,
        payee: 'p1',
        category: 'c1',
      },
      {
        id: '2',
        account: 'acc1',
        date: '2023-01-02',
        amount: -50,
        payee: 'p2',
        category: 'c2',
      },
    ];
    vi.mocked(getTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(fetchAllPayees).mockResolvedValue([
      { id: 'p1', name: 'Store' },
      { id: 'p2', name: 'Gas Station' },
    ]);
    vi.mocked(fetchAllCategories).mockResolvedValue([
      { id: 'c1', name: 'Groceries', group_id: 'g1' },
      { id: 'c2', name: 'Fuel', group_id: 'g2' },
    ]);

    const result = await fetchTransactionsForAccount('acc1', '2023-01-01', '2023-01-31');

    expect(result).toEqual([
      {
        ...mockTransactions[0],
        payee_name: 'Store',
        category_name: 'Groceries',
      },
      {
        ...mockTransactions[1],
        payee_name: 'Gas Station',
        category_name: 'Fuel',
      },
    ]);
    expect(getTransactions).toHaveBeenCalledWith('acc1', '2023-01-01', '2023-01-31');
    expect(fetchAllPayees).toHaveBeenCalledTimes(1);
    expect(fetchAllCategories).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors', async () => {
    vi.mocked(getTransactions).mockRejectedValue(new Error('Transactions API Error'));

    await expect(fetchTransactionsForAccount('acc1', '2023-01-01', '2023-01-31')).rejects.toThrow(
      'Transactions API Error'
    );
    expect(getTransactions).toHaveBeenCalledWith('acc1', '2023-01-01', '2023-01-31');
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('should preserve transfer identifiers from the API response', async () => {
    const mockTransactions = [
      {
        id: 'tx-1',
        account: 'acc1',
        date: '2023-01-03',
        amount: -25,
        transfer_id: 'transfer-link',
      },
    ];

    vi.mocked(getTransactions).mockResolvedValue(mockTransactions);

    const result = await fetchTransactionsForAccount('acc1', '2023-01-01', '2023-01-31');

    expect(result).toEqual(mockTransactions);
    expect(result[0].transfer_id).toBe('transfer-link');
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('should handle empty response without requesting additional lookups', async () => {
    vi.mocked(getTransactions).mockResolvedValue([]);

    const result = await fetchTransactionsForAccount('acc1', '2023-01-01', '2023-01-31');

    expect(result).toEqual([]);
    expect(getTransactions).toHaveBeenCalledWith('acc1', '2023-01-01', '2023-01-31');
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });
});

describe('fetchAllOnBudgetTransactions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return transactions for all on-budget accounts', async () => {
    const mockAccounts: Account[] = [
      { id: 'acc1', name: 'Checking', offbudget: false, closed: false },
      { id: 'acc2', name: 'Savings', offbudget: false, closed: false },
      { id: 'acc3', name: 'Credit Card', offbudget: true, closed: false }, // Should be excluded
      { id: 'acc4', name: 'Old Account', offbudget: false, closed: true }, // Should be excluded
    ];

    const mockTransactions1 = [{ id: '1', account: 'acc1', date: '2023-01-01', amount: -100 }];
    const mockTransactions2 = [{ id: '2', account: 'acc2', date: '2023-01-01', amount: -50 }];

    vi.mocked(getTransactions).mockResolvedValueOnce(mockTransactions1).mockResolvedValueOnce(mockTransactions2);
    vi.mocked(fetchAllPayees).mockResolvedValue([]);
    vi.mocked(fetchAllCategories).mockResolvedValue([]);

    const result = await fetchAllOnBudgetTransactions(mockAccounts, '2023-01-01', '2023-01-31');

    expect(result).toEqual([...mockTransactions1, ...mockTransactions2]);
    expect(getTransactions).toHaveBeenCalledTimes(2);
    expect(getTransactions).toHaveBeenCalledWith('acc1', '2023-01-01', '2023-01-31');
    expect(getTransactions).toHaveBeenCalledWith('acc2', '2023-01-01', '2023-01-31');
  });

  it('should handle empty accounts array', async () => {
    const result = await fetchAllOnBudgetTransactions([], '2023-01-01', '2023-01-31');

    expect(result).toEqual([]);
    expect(getTransactions).not.toHaveBeenCalled();
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('should handle accounts with no on-budget accounts', async () => {
    const mockAccounts: Account[] = [
      { id: 'acc1', name: 'Credit Card', offbudget: true, closed: false },
      { id: 'acc2', name: 'Old Account', offbudget: false, closed: true },
    ];

    const result = await fetchAllOnBudgetTransactions(mockAccounts, '2023-01-01', '2023-01-31');

    expect(result).toEqual([]);
    expect(getTransactions).not.toHaveBeenCalled();
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('should handle API errors for individual accounts', async () => {
    const mockAccounts: Account[] = [{ id: 'acc1', name: 'Checking', offbudget: false, closed: false }];

    vi.mocked(getTransactions).mockRejectedValue(new Error('Transaction API Error'));

    await expect(fetchAllOnBudgetTransactions(mockAccounts, '2023-01-01', '2023-01-31')).rejects.toThrow(
      'Transaction API Error'
    );
    expect(getTransactions).toHaveBeenCalledWith('acc1', '2023-01-01', '2023-01-31');
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('should request lookups once when enrichment is needed', async () => {
    const mockAccounts: Account[] = [
      { id: 'acc1', name: 'Checking', offbudget: false, closed: false },
      { id: 'acc2', name: 'Savings', offbudget: false, closed: false },
    ];

    const mockTransactions1 = [{ id: '1', account: 'acc1', date: '2023-01-01', amount: -100, payee: 'p1' }];
    const mockTransactions2 = [{ id: '2', account: 'acc2', date: '2023-01-01', amount: -50, category: 'c1' }];

    vi.mocked(getTransactions).mockResolvedValueOnce(mockTransactions1).mockResolvedValueOnce(mockTransactions2);
    vi.mocked(fetchAllPayees).mockResolvedValue([{ id: 'p1', name: 'Store' }]);
    vi.mocked(fetchAllCategories).mockResolvedValue([{ id: 'c1', name: 'Fuel', group_id: 'g1' }]);

    const result = await fetchAllOnBudgetTransactions(mockAccounts, '2023-01-01', '2023-01-31');

    expect(result).toEqual([
      { ...mockTransactions1[0], payee_name: 'Store' },
      { ...mockTransactions2[0], category_name: 'Fuel' },
    ]);
    expect(fetchAllPayees).toHaveBeenCalledTimes(1);
    expect(fetchAllCategories).toHaveBeenCalledTimes(1);
  });
});

describe('fetchAllTransactions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return transactions for all accounts with enrichment', async () => {
    const accounts: Account[] = [
      { id: 'acc1', name: 'Checking' },
      { id: 'acc2', name: 'Savings' },
    ];

    const mockTransactions1 = [{ id: '1', account: 'acc1', date: '2023-01-01', amount: -100, payee: 'p1' }];
    const mockTransactions2 = [{ id: '2', account: 'acc2', date: '2023-01-01', amount: -50, category: 'c1' }];

    vi.mocked(getTransactions).mockResolvedValueOnce(mockTransactions1).mockResolvedValueOnce(mockTransactions2);
    vi.mocked(fetchAllPayees).mockResolvedValue([{ id: 'p1', name: 'Store' }]);
    vi.mocked(fetchAllCategories).mockResolvedValue([{ id: 'c1', name: 'Fuel', group_id: 'g1' }]);

    const result = await fetchAllTransactions(accounts, '2023-01-01', '2023-01-31');

    expect(result).toEqual([
      { ...mockTransactions1[0], payee_name: 'Store' },
      { ...mockTransactions2[0], category_name: 'Fuel' },
    ]);
    expect(getTransactions).toHaveBeenCalledTimes(2);
    expect(fetchAllPayees).toHaveBeenCalledTimes(1);
    expect(fetchAllCategories).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when no accounts are provided', async () => {
    const result = await fetchAllTransactions([], '2023-01-01', '2023-01-31');

    expect(result).toEqual([]);
    expect(getTransactions).not.toHaveBeenCalled();
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('should propagate API errors', async () => {
    const accounts: Account[] = [{ id: 'acc1', name: 'Checking' }];

    vi.mocked(getTransactions).mockRejectedValue(new Error('Failure'));

    await expect(fetchAllTransactions(accounts, '2023-01-01', '2023-01-31')).rejects.toThrow('Failure');
    expect(fetchAllPayees).not.toHaveBeenCalled();
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });
});
