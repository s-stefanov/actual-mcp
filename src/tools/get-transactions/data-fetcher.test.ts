import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../actual-api.js', () => ({
  queryTransactions: vi.fn(),
  getPayeeCategoryCounts: vi.fn(),
}));
vi.mock('../../core/data/fetch-transactions.js', () => ({
  enrichTransactions: vi.fn(async (transactions: unknown[]) => transactions),
}));

import { getPayeeCategoryCounts, queryTransactions } from '../../actual-api.js';
import type { Category, Transaction } from '../../core/types/domain.js';
import {
  buildTransactionFilter,
  escapeLike,
  GetTransactionsDataFetcher,
  resolveCategory,
  summarizePayeeHistory,
} from './data-fetcher.js';

describe('GetTransactionsDataFetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queryTransactions).mockResolvedValue({ transactions: [], total: 0 });
  });

  it('sends the filter and paging to the query engine and passes the total through', async () => {
    vi.mocked(queryTransactions).mockResolvedValue({ transactions: [], total: 42 });

    const result = await new GetTransactionsDataFetcher().fetch({ categoryId: 'groceries', limit: 10, offset: 20 });

    expect(queryTransactions).toHaveBeenCalledWith({ category: 'groceries' }, { limit: 10, offset: 20 });
    expect(result.total).toBe(42);
  });

  it('looks up payee history once for the distinct payees on the page, including split lines', async () => {
    vi.mocked(getPayeeCategoryCounts).mockResolvedValue([]);
    const transactions: Transaction[] = [
      { id: 't1', account: 'a', date: '2026-10-01', amount: -100, payee: 'p1' },
      { id: 't2', account: 'a', date: '2026-10-01', amount: -100, payee: 'p1' },
      { id: 't3', account: 'a', date: '2026-10-01', amount: -100, payee: null },
      {
        id: 't4',
        account: 'a',
        date: '2026-10-01',
        amount: -100,
        payee: 'p2',
        subtransactions: [{ id: 't4a', account: 'a', date: '2026-10-01', amount: -100, payee: 'p3' }],
      },
    ];

    await new GetTransactionsDataFetcher().fetchPayeeHistory(transactions);

    expect(getPayeeCategoryCounts).toHaveBeenCalledTimes(1);
    expect(getPayeeCategoryCounts).toHaveBeenCalledWith(['p1', 'p2', 'p3']);
  });
});

describe('summarizePayeeHistory', () => {
  it('keeps the three most-used categories per payee', () => {
    const history = summarizePayeeHistory([
      { payee: 'p1', category: 'a', category_name: 'A', count: 1 },
      { payee: 'p1', category: 'b', category_name: 'B', count: 9 },
      { payee: 'p1', category: 'c', category_name: 'C', count: 4 },
      { payee: 'p1', category: 'd', category_name: 'D', count: 2 },
      { payee: 'p2', category: 'a', category_name: 'A', count: 3 },
    ]);

    expect(history.p1.map((h) => h.category)).toEqual(['b', 'c', 'd']);
    expect(history.p2).toEqual([{ category: 'a', category_name: 'A', count: 3 }]);
  });
});

describe('buildTransactionFilter', () => {
  it('omits every clause that was not asked for, so all accounts (including off-budget) are searched', () => {
    expect(buildTransactionFilter({})).toEqual({});
  });

  it('builds account, date, amount (in cents), category, and payee clauses', () => {
    expect(
      buildTransactionFilter({
        accountId: 'checking',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        minAmount: -50.5,
        maxAmount: 0,
        categoryId: 'groceries',
        payeeName: 'Whole',
      })
    ).toEqual({
      account: 'checking',
      date: { $gte: '2026-01-01', $lte: '2026-03-31' },
      amount: { $gte: -5050, $lte: 0 },
      category: 'groceries',
      'payee.name': { $like: '%Whole%' },
    });
  });

  it("matches Actual's Uncategorized view when uncategorized is set", () => {
    expect(buildTransactionFilter({ uncategorized: true, accountId: 'checking' })).toEqual({
      account: 'checking',
      'account.offbudget': false,
      category: null,
      is_parent: false,
      $or: [{ 'payee.transfer_acct': null }, { 'payee.transfer_acct.offbudget': true }],
    });
  });

  it('supports an open-ended date range', () => {
    expect(buildTransactionFilter({ startDate: '2026-01-01' })).toEqual({ date: { $gte: '2026-01-01' } });
  });
});

describe('escapeLike', () => {
  it('escapes $like wildcards and the escape character, leaving other text alone', () => {
    expect(escapeLike('100% off?')).toBe('100\\% off\\?');
    expect(escapeLike('a\\b_c')).toBe('a\\\\b_c');
  });

  it('is applied to the payee and notes filters', () => {
    expect(buildTransactionFilter({ payeeName: '100%' })).toEqual({ 'payee.name': { $like: '%100\\%%' } });
    expect(buildTransactionFilter({ notes: 'tax?' })).toEqual({ notes: { $like: '%tax\\?%' } });
  });
});

describe('resolveCategory', () => {
  const categories: Category[] = [
    { id: 'food', name: 'Food', group_id: 'g' },
    { id: 'fast-food', name: 'Fast Food', group_id: 'g' },
    { id: 'pet-food', name: 'Pet Food', group_id: 'g' },
    { id: 'rent', name: 'Rent', group_id: 'g' },
  ];

  it('prefers an exact, case-insensitive name over partial matches', () => {
    expect(resolveCategory(categories, 'food').id).toBe('food');
  });

  it('uses a single partial match', () => {
    expect(resolveCategory(categories, 'pet').id).toBe('pet-food');
  });

  it('lists the candidates when a partial name is ambiguous', () => {
    expect(() => resolveCategory(categories, 'Foo')).toThrow(/Food \(food\).*Fast Food \(fast-food\).*categoryId/);
  });

  it('reports when nothing matches', () => {
    expect(() => resolveCategory(categories, 'Travel')).toThrow('No category matches "Travel"');
  });
});
