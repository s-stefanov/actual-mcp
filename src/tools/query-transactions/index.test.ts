import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({
  getAccounts: vi.fn(),
  getCategories: vi.fn(),
  getPayees: vi.fn(),
}));

vi.mock('../../core/data/fetch-transactions.js', () => ({
  fetchTransactionsForAccount: vi.fn(),
  fetchAllOnBudgetTransactions: vi.fn(),
}));

vi.mock('../../utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils.js')>();
  return {
    ...actual,
    getDateRange: vi.fn(() => ({ startDate: '2026-01-01', endDate: '2026-03-31' })),
  };
});

import { handler, schema } from './index.js';
import { getAccounts, getCategories, getPayees } from '../../actual-api.js';
import { fetchTransactionsForAccount, fetchAllOnBudgetTransactions } from '../../core/data/fetch-transactions.js';
import { textContent } from '../../utils/response.js';
import type { Transaction } from '../../core/types/domain.js';

const mockAccounts = [
  { id: 'acct-1', name: 'Checking', offbudget: false, closed: false },
  { id: 'acct-2', name: 'Savings', offbudget: false, closed: false },
  { id: 'acct-off', name: '401k', offbudget: true, closed: false },
];

const mockCategories = [
  { id: 'cat-food', name: 'Food', group_id: 'grp-usual' },
  { id: 'cat-gas', name: 'Gas', group_id: 'grp-usual' },
  { id: 'grp-usual', name: 'Usual Expenses' }, // group — no group_id
];

const mockPayees = [
  { id: 'payee-kroger', name: 'Kroger' },
  { id: 'payee-shell', name: 'Shell' },
];

const makeTxn = (overrides: Partial<Transaction>): Transaction => ({
  id: 'txn-default',
  account: 'acct-1',
  date: '2026-02-01',
  amount: -1000,
  payee: 'payee-kroger',
  payee_name: 'Kroger',
  category: 'cat-food',
  category_name: 'Food',
  notes: '',
  cleared: true,
  ...overrides,
});

describe('query-transactions tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAccounts).mockResolvedValue(mockAccounts as never);
    vi.mocked(getCategories).mockResolvedValue(mockCategories as never);
    vi.mocked(getPayees).mockResolvedValue(mockPayees as never);
    vi.mocked(fetchAllOnBudgetTransactions).mockResolvedValue([]);
    vi.mocked(fetchTransactionsForAccount).mockResolvedValue([]);
  });

  describe('schema', () => {
    it('should have correct name', () => {
      expect(schema.name).toBe('query-transactions');
    });

    it('should have inputSchema defined', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('default behavior (no filters)', () => {
    it('should fetch all on-budget transactions and show results', async () => {
      vi.mocked(fetchAllOnBudgetTransactions).mockResolvedValue([
        makeTxn({ id: 'txn-1', amount: -5000 }),
        makeTxn({ id: 'txn-2', amount: -3000 }),
      ]);

      const result = await handler({});

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('Showing 2 of 2 transactions');
      expect(vi.mocked(fetchAllOnBudgetTransactions)).toHaveBeenCalledTimes(1);
    });
  });

  describe('category filter by name', () => {
    it('should filter transactions by category name (case-insensitive)', async () => {
      vi.mocked(fetchAllOnBudgetTransactions).mockResolvedValue([
        makeTxn({ id: 'txn-1', category: 'cat-food', category_name: 'Food', amount: -5000 }),
        makeTxn({ id: 'txn-2', category: 'cat-gas', category_name: 'Gas', amount: -2000 }),
      ]);

      const result = await handler({ filters: { category: 'food' } });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('Showing 1 of 1 transactions');
      expect(text).toContain('Food');
    });

    it('should return error when category name does not match any known category', async () => {
      const result = await handler({ filters: { category: 'NotACategory' } });

      expect(result.isError).toBe(true);
      const text = textContent(result.content[0]);
      expect(text).toContain('NotACategory');
    });
  });

  describe('date range filter', () => {
    it('should filter by $gt (string comparison, excludes boundary date)', async () => {
      vi.mocked(fetchAllOnBudgetTransactions).mockResolvedValue([
        makeTxn({ id: 'txn-1', date: '2026-01-10', amount: -1000 }),
        makeTxn({ id: 'txn-2', date: '2026-01-15', amount: -2000 }),
        makeTxn({ id: 'txn-3', date: '2026-01-20', amount: -3000 }),
      ]);

      // date > 2026-01-15 => only txn-3 (txn-2 on boundary is excluded)
      const result = await handler({ filters: { date: { $gt: '2026-01-15' } } });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('Showing 1 of 1');
    });

    it('should pass date bounds to getDateRange when date filter has $gte/$lte', async () => {
      const { getDateRange } = await import('../../utils.js');
      vi.mocked(getDateRange).mockReturnValue({ startDate: '2026-02-01', endDate: '2026-02-28' });

      vi.mocked(fetchAllOnBudgetTransactions).mockResolvedValue([
        makeTxn({ id: 'txn-1', date: '2026-02-15', amount: -1000 }),
      ]);

      const result = await handler({ filters: { date: { $gte: '2026-02-01', $lte: '2026-02-28' } } });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('Showing 1 of 1');
      expect(vi.mocked(getDateRange)).toHaveBeenCalledWith('2026-02-01', '2026-02-28');
    });
  });

  describe('amount operator filters', () => {
    it('should filter by $lt (dollars converted to cents)', async () => {
      vi.mocked(fetchAllOnBudgetTransactions).mockResolvedValue([
        makeTxn({ id: 'txn-1', amount: -5000 }), // -$50
        makeTxn({ id: 'txn-2', amount: -1000 }), // -$10
        makeTxn({ id: 'txn-3', amount: -3000 }), // -$30
      ]);

      // amount < -20 (dollars) => amount < -2000 (cents)
      const result = await handler({ filters: { amount: { $lt: -20 } } });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('Showing 2 of 2'); // txn-1 and txn-3 are < -$20
    });

    it('should filter by $gte (dollars converted to cents)', async () => {
      vi.mocked(fetchAllOnBudgetTransactions).mockResolvedValue([
        makeTxn({ id: 'txn-1', amount: -5000 }), // -$50
        makeTxn({ id: 'txn-2', amount: -1000 }), // -$10
      ]);

      // amount >= -20 (dollars) => keep -$10
      const result = await handler({ filters: { amount: { $gte: -20 } } });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('Showing 1 of 1');
    });

    it('should filter by $oneof (dollars converted to cents for each element)', async () => {
      vi.mocked(fetchAllOnBudgetTransactions).mockResolvedValue([
        makeTxn({ id: 'txn-1', amount: -5000 }), // -$50
        makeTxn({ id: 'txn-2', amount: -3000 }), // -$30
        makeTxn({ id: 'txn-3', amount: -1000 }), // -$10
      ]);

      // $oneof [-50, -30] (dollars) => match -5000 and -3000 (cents)
      const result = await handler({ filters: { amount: { $oneof: [-50, -30] } } });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('Showing 2 of 2');
    });
  });

  describe('tag filter', () => {
    it('should filter by single tag matching #hashtag in notes', async () => {
      vi.mocked(fetchAllOnBudgetTransactions).mockResolvedValue([
        makeTxn({ id: 'txn-1', notes: 'lunch #fastfood', amount: -1200 }),
        makeTxn({ id: 'txn-2', notes: 'groceries', amount: -8000 }),
      ]);

      const result = await handler({ filters: { tag: 'fastfood' } });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('Showing 1 of 1');
    });

    it('should filter by array of tags using OR logic', async () => {
      vi.mocked(fetchAllOnBudgetTransactions).mockResolvedValue([
        makeTxn({ id: 'txn-1', notes: '#fastfood burger', amount: -1200 }),
        makeTxn({ id: 'txn-2', notes: 'sushi #dining', amount: -4500 }),
        makeTxn({ id: 'txn-3', notes: 'groceries', amount: -8000 }),
      ]);

      const result = await handler({ filters: { tag: ['fastfood', 'dining'] } });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('Showing 2 of 2');
    });
  });

  describe('multiple filters combined', () => {
    it('should apply category + amount filters together', async () => {
      vi.mocked(fetchAllOnBudgetTransactions).mockResolvedValue([
        makeTxn({ id: 'txn-1', category: 'cat-food', category_name: 'Food', amount: -5000 }),
        makeTxn({ id: 'txn-2', category: 'cat-food', category_name: 'Food', amount: -1000 }),
        makeTxn({ id: 'txn-3', category: 'cat-gas', category_name: 'Gas', amount: -5000 }),
      ]);

      // food AND amount < -$30
      const result = await handler({ filters: { category: 'Food', amount: { $lt: -30 } } });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('Showing 1 of 1'); // only txn-1
    });
  });

  describe('name resolution', () => {
    it('should resolve payee name to ID for matching', async () => {
      vi.mocked(fetchAllOnBudgetTransactions).mockResolvedValue([
        makeTxn({ id: 'txn-1', payee: 'payee-kroger', payee_name: 'Kroger', amount: -2000 }),
        makeTxn({ id: 'txn-2', payee: 'payee-shell', payee_name: 'Shell', amount: -4000 }),
      ]);

      const result = await handler({ filters: { payee: 'Kroger' } });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('Showing 1 of 1');
      expect(text).toContain('Kroger');
    });

    it('should return error when payee name is not found', async () => {
      const result = await handler({ filters: { payee: 'NoSuchPayee' } });

      expect(result.isError).toBe(true);
      const text = textContent(result.content[0]);
      expect(text).toContain('NoSuchPayee');
    });
  });

  describe('includeSummary', () => {
    it('should include summary stats when includeSummary is true', async () => {
      vi.mocked(fetchAllOnBudgetTransactions).mockResolvedValue([
        makeTxn({ id: 'txn-1', amount: -6000 }),
        makeTxn({ id: 'txn-2', amount: -3000 }),
      ]);

      const result = await handler({ includeSummary: true });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('## Summary');
      expect(text).toContain('Count');
      expect(text).toContain('Total');
      expect(text).toContain('-$90.00'); // total: -9000 cents
      expect(text).toContain('-$45.00'); // average: -4500 cents
    });
  });

  describe('groupBy with summary', () => {
    it('should show per-group stats when groupBy and includeSummary are set', async () => {
      vi.mocked(fetchAllOnBudgetTransactions).mockResolvedValue([
        makeTxn({ id: 'txn-1', category: 'cat-food', category_name: 'Food', amount: -5000 }),
        makeTxn({ id: 'txn-2', category: 'cat-food', category_name: 'Food', amount: -3000 }),
        makeTxn({ id: 'txn-3', category: 'cat-gas', category_name: 'Gas', amount: -4000 }),
      ]);

      const result = await handler({ includeSummary: true, groupBy: 'category' });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('## Summary by Category');
      expect(text).toContain('Food');
      expect(text).toContain('Gas');
      // Food: 2 txns, -$80
      expect(text).toContain('-$80.00');
    });
  });

  describe('orderBy and limit', () => {
    it('should sort ascending by amount and respect limit', async () => {
      vi.mocked(fetchAllOnBudgetTransactions).mockResolvedValue([
        makeTxn({ id: 'txn-1', amount: -5000, date: '2026-02-01' }),
        makeTxn({ id: 'txn-2', amount: -1000, date: '2026-02-02' }),
        makeTxn({ id: 'txn-3', amount: -3000, date: '2026-02-03' }),
      ]);

      const result = await handler({ orderBy: { amount: 'asc' }, limit: 2 });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('Showing 2 of 3 transactions');
      // first row should be -$50 (most negative = smallest number)
      const firstDataRow = text.split('\n').find((line) => line.startsWith('| ') && line.includes('-$'));
      expect(firstDataRow).toContain('-$50.00');
    });
  });

  describe('no results', () => {
    it('should return a no-results message when nothing matches', async () => {
      vi.mocked(fetchAllOnBudgetTransactions).mockResolvedValue([
        makeTxn({ id: 'txn-1', category: 'cat-gas', category_name: 'Gas' }),
      ]);

      // category filter resolves to cat-food, but txn has cat-gas
      const result = await handler({ filters: { category: 'Food' } });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text.toLowerCase()).toContain('no transactions');
    });
  });

  describe('account filter', () => {
    it('should use fetchTransactionsForAccount when account filter is given', async () => {
      vi.mocked(fetchTransactionsForAccount).mockResolvedValue([makeTxn({ id: 'txn-1', account: 'acct-1' })]);

      const result = await handler({ filters: { account: 'Checking' } });

      expect(result.isError).toBeUndefined();
      expect(vi.mocked(fetchTransactionsForAccount)).toHaveBeenCalledWith(
        'acct-1',
        expect.any(String),
        expect.any(String)
      );
      expect(vi.mocked(fetchAllOnBudgetTransactions)).not.toHaveBeenCalled();
    });

    it('should return error when account name is not found', async () => {
      const result = await handler({ filters: { account: 'NoSuchAccount' } });

      expect(result.isError).toBe(true);
      const text = textContent(result.content[0]);
      expect(text).toContain('NoSuchAccount');
    });
  });

  describe('error handling', () => {
    it('should return error response when getAccounts throws', async () => {
      vi.mocked(getAccounts).mockRejectedValue(new Error('Connection refused'));

      const result = await handler({});

      expect(result.isError).toBe(true);
      const text = textContent(result.content[0]);
      expect(text).toContain('Connection refused');
    });
  });
});
