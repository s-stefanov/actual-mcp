import { describe, it, expect, vi } from 'vitest';
import { TransactionGrouper } from './transaction-grouper.js';
import type { Transaction, CategoryGroupInfo } from '../types/domain.js';

describe('TransactionGrouper', () => {
  const grouper = new TransactionGrouper();

  const mockGetCategoryName = vi.fn((categoryId: string) => {
    const names: Record<string, string> = {
      cat1: 'Food',
      cat2: 'Rent',
      cat3: 'Salary',
      cat4: 'Utilities',
    };
    return names[categoryId] || 'Unknown Category';
  });

  const mockGetGroupInfo = vi.fn((categoryId: string): CategoryGroupInfo | undefined => {
    const groups: Record<string, CategoryGroupInfo> = {
      cat1: {
        id: 'g1',
        name: 'Living',
        isIncome: false,
      },
      cat2: {
        id: 'g1',
        name: 'Living',
        isIncome: false,
      },
      cat3: {
        id: 'g2',
        name: 'Income',
        isIncome: true,
      },
      cat4: {
        id: 'g1',
        name: 'Living',
        isIncome: false,
      },
    };
    return groups[categoryId];
  });

  const mockTransactions: Transaction[] = [
    {
      id: '1',
      account: 'acc1',
      date: '2023-01-01',
      amount: -100,
      category: 'cat1',
    },
    {
      id: '2',
      account: 'acc1',
      date: '2023-01-02',
      amount: -50,
      category: 'cat1',
    },
    {
      id: '3',
      account: 'acc1',
      date: '2023-01-03',
      amount: -800,
      category: 'cat2',
    },
    {
      id: '4',
      account: 'acc1',
      date: '2023-01-04',
      amount: 2000,
      category: 'cat3',
    },
    {
      id: '5',
      account: 'acc1',
      date: '2023-01-05',
      amount: -200,
      category: 'cat4',
    },
    { id: '6', account: 'acc1', date: '2023-01-06', amount: 100 }, // No category
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should group transactions by category excluding income when includeIncome is false', () => {
    const result = grouper.groupByCategory(mockTransactions, mockGetCategoryName, mockGetGroupInfo, false);

    expect(result).toHaveProperty('cat1');
    expect(result).toHaveProperty('cat2');
    expect(result).toHaveProperty('cat4');
    expect(result).not.toHaveProperty('cat3'); // Income excluded

    expect(result['cat1']).toEqual({
      id: 'cat1',
      name: 'Food',
      group: 'Living',
      isIncome: false,
      total: -150, // -100 + -50
      transactions: 2,
    });

    expect(result['cat2']).toEqual({
      id: 'cat2',
      name: 'Rent',
      group: 'Living',
      isIncome: false,
      total: -800,
      transactions: 1,
    });

    expect(result['cat4']).toEqual({
      id: 'cat4',
      name: 'Utilities',
      group: 'Living',
      isIncome: false,
      total: -200,
      transactions: 1,
    });
  });

  it('should group transactions by category including income when includeIncome is true', () => {
    const result = grouper.groupByCategory(mockTransactions, mockGetCategoryName, mockGetGroupInfo, true);

    expect(result).toHaveProperty('cat1');
    expect(result).toHaveProperty('cat2');
    expect(result).toHaveProperty('cat3'); // Income included
    expect(result).toHaveProperty('cat4');

    expect(result['cat3']).toEqual({
      id: 'cat3',
      name: 'Salary',
      group: 'Income',
      isIncome: true,
      total: 2000,
      transactions: 1,
    });
  });

  it('should skip transactions without category', () => {
    const transactionsWithoutCategory: Transaction[] = [
      { id: '1', account: 'acc1', date: '2023-01-01', amount: -100 }, // No category
      {
        id: '2',
        account: 'acc1',
        date: '2023-01-02',
        amount: -50,
        category: 'cat1',
      },
    ];

    const result = grouper.groupByCategory(transactionsWithoutCategory, mockGetCategoryName, mockGetGroupInfo, false);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result).toHaveProperty('cat1');
    expect(result).not.toHaveProperty('undefined');
  });

  it('should handle unknown categories with default group', () => {
    const transactionsWithUnknownCategory: Transaction[] = [
      {
        id: '1',
        account: 'acc1',
        date: '2023-01-01',
        amount: -100,
        category: 'unknown',
      },
    ];

    const result = grouper.groupByCategory(
      transactionsWithUnknownCategory,
      mockGetCategoryName,
      mockGetGroupInfo,
      false
    );

    expect(result).toHaveProperty('unknown');
    expect(result['unknown']).toEqual({
      id: 'unknown',
      name: 'Unknown Category',
      group: 'Unknown Group',
      isIncome: false,
      total: -100,
      transactions: 1,
    });
  });

  it('should handle empty transactions array', () => {
    const result = grouper.groupByCategory([], mockGetCategoryName, mockGetGroupInfo, false);

    expect(result).toEqual({});
  });

  it('should accumulate multiple transactions for the same category', () => {
    const sameCategory: Transaction[] = [
      {
        id: '1',
        account: 'acc1',
        date: '2023-01-01',
        amount: -100,
        category: 'cat1',
      },
      {
        id: '2',
        account: 'acc1',
        date: '2023-01-02',
        amount: -50,
        category: 'cat1',
      },
      {
        id: '3',
        account: 'acc1',
        date: '2023-01-03',
        amount: -25,
        category: 'cat1',
      },
    ];

    const result = grouper.groupByCategory(sameCategory, mockGetCategoryName, mockGetGroupInfo, false);

    expect(result['cat1']).toEqual({
      id: 'cat1',
      name: 'Food',
      group: 'Living',
      isIncome: false,
      total: -175, // -100 + -50 + -25
      transactions: 3,
    });
  });

  it('should handle positive transaction amounts correctly', () => {
    const positiveTransactions: Transaction[] = [
      {
        id: '1',
        account: 'acc1',
        date: '2023-01-01',
        amount: 100,
        category: 'cat1',
      },
      {
        id: '2',
        account: 'acc1',
        date: '2023-01-02',
        amount: 50,
        category: 'cat1',
      },
    ];

    const result = grouper.groupByCategory(positiveTransactions, mockGetCategoryName, mockGetGroupInfo, false);

    expect(result['cat1']).toEqual({
      id: 'cat1',
      name: 'Food',
      group: 'Living',
      isIncome: false,
      total: 150, // 100 + 50
      transactions: 2,
    });
  });

  it('groups the legs of a split by their own categories and ignores the parent', () => {
    const split: Transaction[] = [
      {
        id: 'p',
        account: 'acc1',
        date: '2023-01-01',
        amount: -150,
        subtransactions: [
          { id: 'l1', account: 'acc1', date: '2023-01-01', amount: -100, category: 'cat1' },
          { id: 'l2', account: 'acc1', date: '2023-01-01', amount: -50, category: 'cat2' },
        ],
      },
    ];

    const result = grouper.groupByCategory(split, mockGetCategoryName, mockGetGroupInfo, false);

    expect(Object.keys(result).sort()).toEqual(['cat1', 'cat2']);
    expect(result.cat1).toMatchObject({ total: -100, transactions: 1 });
    expect(result.cat2).toMatchObject({ total: -50, transactions: 1 });
  });

  it('counts uncategorized transactions in an Uncategorized entry when includeUncategorized is true', () => {
    const txs: Transaction[] = [
      { id: '1', account: 'acc1', date: '2023-01-01', amount: -100 },
      { id: '2', account: 'acc1', date: '2023-01-02', amount: -30 },
      { id: '3', account: 'acc1', date: '2023-01-03', amount: -50, category: 'cat1' },
    ];

    const result = grouper.groupByCategory(txs, mockGetCategoryName, mockGetGroupInfo, false, true);

    expect(result.uncategorized).toEqual({
      id: 'uncategorized',
      name: 'Uncategorized',
      group: 'Uncategorized',
      isIncome: false,
      total: -130,
      transactions: 2,
    });
    expect(result.cat1.total).toBe(-50);
  });

  it('leaves uncategorized transfer legs out even when includeUncategorized is true', () => {
    const txs: Transaction[] = [
      { id: '1', account: 'acc1', date: '2023-01-01', amount: -100, transfer_id: 't1' },
      {
        id: 'p',
        account: 'acc1',
        date: '2023-01-02',
        amount: -80,
        subtransactions: [{ id: 'l1', account: 'acc1', date: '2023-01-02', amount: -80, transfer_id: 't2' }],
      },
    ];

    const result = grouper.groupByCategory(txs, mockGetCategoryName, mockGetGroupInfo, false, true);

    expect(result).not.toHaveProperty('uncategorized');
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('counts an uncategorized split leg in the Uncategorized entry', () => {
    const split: Transaction[] = [
      {
        id: 'p',
        account: 'acc1',
        date: '2023-01-01',
        amount: -150,
        subtransactions: [
          { id: 'l1', account: 'acc1', date: '2023-01-01', amount: -100, category: 'cat1' },
          { id: 'l2', account: 'acc1', date: '2023-01-01', amount: -50 },
        ],
      },
    ];

    const result = grouper.groupByCategory(split, mockGetCategoryName, mockGetGroupInfo, false, true);

    expect(result.cat1.total).toBe(-100);
    expect(result.uncategorized).toMatchObject({ total: -50, transactions: 1 });
  });

  it('still skips uncategorized transactions when includeUncategorized is omitted', () => {
    const txs: Transaction[] = [
      { id: '1', account: 'acc1', date: '2023-01-01', amount: -100 },
      { id: '2', account: 'acc1', date: '2023-01-02', amount: -50, category: 'cat1' },
    ];

    const result = grouper.groupByCategory(txs, mockGetCategoryName, mockGetGroupInfo, false);

    expect(result).not.toHaveProperty('uncategorized');
    expect(Object.keys(result)).toEqual(['cat1']);
  });
});
