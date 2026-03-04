import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
  getPayees: vi.fn(),
  getCategories: vi.fn(),
}));

import { handler, schema } from './index.js';
import { getAccounts, getTransactions, getPayees, getCategories } from '../../actual-api.js';
import { textContent } from '../../utils/response.js';

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
  { id: 'payee-1', name: 'Kroger' },
  { id: 'payee-2', name: 'Shell' },
];

describe('query-transactions tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAccounts).mockResolvedValue(mockAccounts as never);
    vi.mocked(getCategories).mockResolvedValue(mockCategories as never);
    vi.mocked(getPayees).mockResolvedValue(mockPayees as never);
    vi.mocked(getTransactions).mockResolvedValue([] as never);
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

  describe('happy path - category filter', () => {
    it('should return count/total/average for matching transactions', async () => {
      vi.mocked(getTransactions)
        .mockResolvedValueOnce([
          { id: 'txn-1', date: '2026-02-05', amount: -5000, payee: 'payee-1', category: 'cat-food' } as never,
          { id: 'txn-2', date: '2026-02-10', amount: -3000, payee: 'payee-1', category: 'cat-food' } as never,
          { id: 'txn-3', date: '2026-02-12', amount: -2000, payee: 'payee-2', category: 'cat-gas' } as never,
        ])
        .mockResolvedValueOnce([
          { id: 'txn-4', date: '2026-02-15', amount: -4000, payee: 'payee-1', category: 'cat-food' } as never,
        ]);

      const result = await handler({ category: 'Food', startDate: '2026-02-01', endDate: '2026-02-28' });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('3'); // count
      expect(text).toContain('-$120.00'); // total: -12000 cents
      expect(text).toContain('-$40.00'); // average: -4000 cents
      expect(text).toContain('Food');
    });
  });

  describe('happy path - payee filter', () => {
    it('should filter transactions by payee name', async () => {
      vi.mocked(getTransactions)
        .mockResolvedValueOnce([
          { id: 'txn-1', date: '2026-02-05', amount: -5000, payee: 'payee-1', category: 'cat-food' } as never,
          { id: 'txn-2', date: '2026-02-10', amount: -3000, payee: 'payee-2', category: 'cat-gas' } as never,
        ])
        .mockResolvedValueOnce([]);

      const result = await handler({ payee: 'Kroger', startDate: '2026-02-01', endDate: '2026-02-28' });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('1'); // only 1 Kroger transaction
      expect(text).toContain('-$50.00');
      expect(text).toContain('Kroger');
    });
  });

  describe('multiple filters', () => {
    it('should apply category + date range + account filters together', async () => {
      vi.mocked(getTransactions).mockResolvedValueOnce([
        { id: 'txn-1', date: '2026-02-05', amount: -5000, payee: 'payee-1', category: 'cat-food' } as never,
        { id: 'txn-2', date: '2026-02-10', amount: -3000, payee: 'payee-2', category: 'cat-gas' } as never,
      ]);

      const result = await handler({
        category: 'Food',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        accountId: 'acct-1',
      });

      expect(result.isError).toBeUndefined();
      // should only call getTransactions once (filtered to acct-1)
      expect(getTransactions).toHaveBeenCalledTimes(1);
      expect(getTransactions).toHaveBeenCalledWith('acct-1', '2026-02-01', '2026-02-28');

      const text = textContent(result.content[0]);
      expect(text).toContain('1'); // only Food transaction
      expect(text).toContain('-$50.00');
    });
  });

  describe('no matching transactions', () => {
    it('should return a no-results message', async () => {
      vi.mocked(getTransactions).mockResolvedValue([
        { id: 'txn-1', date: '2026-02-05', amount: -5000, payee: 'payee-2', category: 'cat-gas' } as never,
      ] as never);

      const result = await handler({ category: 'Food', startDate: '2026-02-01', endDate: '2026-02-28' });

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text.toLowerCase()).toContain('no transactions');
    });
  });

  describe('no filters', () => {
    it('should return stats for all transactions when no filters provided', async () => {
      vi.mocked(getTransactions)
        .mockResolvedValueOnce([
          { id: 'txn-1', date: '2026-02-05', amount: -5000, payee: 'payee-1', category: 'cat-food' } as never,
        ])
        .mockResolvedValueOnce([
          { id: 'txn-2', date: '2026-02-10', amount: -3000, payee: 'payee-2', category: 'cat-gas' } as never,
        ]);

      const result = await handler({});

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('2'); // count across both accounts
      expect(text).toContain('-$80.00'); // total: -8000 cents
    });
  });

  describe('API error', () => {
    it('should return error response when getAccounts throws', async () => {
      vi.mocked(getAccounts).mockRejectedValue(new Error('Connection refused'));

      const result = await handler({});

      expect(result.isError).toBe(true);
      const text = textContent(result.content[0]);
      expect(text).toContain('Connection refused');
    });
  });

  describe('case-insensitive matching', () => {
    it('should match category names case-insensitively', async () => {
      vi.mocked(getTransactions)
        .mockResolvedValueOnce([
          { id: 'txn-1', date: '2026-02-05', amount: -5000, payee: 'payee-1', category: 'cat-food' } as never,
        ] as never)
        .mockResolvedValueOnce([] as never);

      const result = await handler({ category: 'food' }); // lowercase, should match "Food"

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('1'); // 1 match
      expect(text).toContain('-$50.00');
    });

    it('should match payee names case-insensitively', async () => {
      vi.mocked(getTransactions)
        .mockResolvedValueOnce([
          { id: 'txn-1', date: '2026-02-05', amount: -5000, payee: 'payee-1', category: 'cat-food' } as never,
        ] as never)
        .mockResolvedValueOnce([] as never);

      const result = await handler({ payee: 'kroger' }); // lowercase, should match "Kroger"

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('1');
    });
  });
});
