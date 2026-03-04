import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({}));

vi.mock('../../core/data/fetch-transactions.js', () => ({
  fetchTransactionsForAccount: vi.fn(),
}));

vi.mock('../../utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils.js')>();
  return {
    ...actual,
    getDateRange: vi.fn(() => ({ startDate: '2026-01-01', endDate: '2026-01-31' })),
  };
});

import { handler, schema } from './index.js';
import { fetchTransactionsForAccount } from '../../core/data/fetch-transactions.js';

const baseArgs = {
  accountId: 'acct-1',
};

describe('get-transactions tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name', () => {
      expect(schema.name).toBe('get-transactions');
    });

    it('should have inputSchema defined', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('handler - payee name resolution', () => {
    it('should show payee_name when present', async () => {
      vi.mocked(fetchTransactionsForAccount).mockResolvedValue([
        {
          id: 'txn-1',
          account: 'acct-1',
          date: '2026-01-15',
          payee: 'payee-uuid-1',
          payee_name: 'Meijer',
          category: 'cat-uuid-1',
          category_name: 'Food',
          amount: -2500,
          notes: 'groceries',
          cleared: true,
        },
      ]);

      const result = await handler(baseArgs);

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Meijer');
      expect(text).not.toContain('payee-uuid-1');
    });

    it('should fall back to raw payee UUID when payee_name is missing', async () => {
      vi.mocked(fetchTransactionsForAccount).mockResolvedValue([
        {
          id: 'txn-2',
          account: 'acct-1',
          date: '2026-01-16',
          payee: 'payee-uuid-2',
          payee_name: undefined,
          category: 'cat-uuid-1',
          category_name: 'Food',
          amount: -1000,
          notes: '',
          cleared: false,
        },
      ]);

      const result = await handler(baseArgs);

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('payee-uuid-2');
    });

    it('should show (No payee) when both payee_name and payee are missing', async () => {
      vi.mocked(fetchTransactionsForAccount).mockResolvedValue([
        {
          id: 'txn-3',
          account: 'acct-1',
          date: '2026-01-17',
          payee: undefined,
          payee_name: undefined,
          category: 'cat-uuid-1',
          category_name: 'Food',
          amount: -500,
          notes: '',
          cleared: false,
        },
      ]);

      const result = await handler(baseArgs);

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('(No payee)');
    });
  });

  describe('handler - category name resolution', () => {
    it('should show category_name when present', async () => {
      vi.mocked(fetchTransactionsForAccount).mockResolvedValue([
        {
          id: 'txn-4',
          account: 'acct-1',
          date: '2026-01-18',
          payee: 'payee-uuid-1',
          payee_name: 'Shell',
          category: 'cat-uuid-gas',
          category_name: 'Gas',
          amount: -4500,
          notes: '',
          cleared: true,
        },
      ]);

      const result = await handler(baseArgs);

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Gas');
      expect(text).not.toContain('cat-uuid-gas');
    });

    it('should fall back to raw category UUID when category_name is missing', async () => {
      vi.mocked(fetchTransactionsForAccount).mockResolvedValue([
        {
          id: 'txn-5',
          account: 'acct-1',
          date: '2026-01-19',
          payee: 'payee-uuid-1',
          payee_name: 'Walmart',
          category: 'cat-uuid-shopping',
          category_name: undefined,
          amount: -3000,
          notes: '',
          cleared: true,
        },
      ]);

      const result = await handler(baseArgs);

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('cat-uuid-shopping');
    });

    it('should show (Uncategorized) when both category_name and category are missing', async () => {
      vi.mocked(fetchTransactionsForAccount).mockResolvedValue([
        {
          id: 'txn-6',
          account: 'acct-1',
          date: '2026-01-20',
          payee: 'payee-uuid-1',
          payee_name: 'Amazon',
          category: undefined,
          category_name: undefined,
          amount: -1500,
          notes: '',
          cleared: false,
        },
      ]);

      const result = await handler(baseArgs);

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('(Uncategorized)');
    });
  });

  describe('handler - filtering by payeeName', () => {
    it('should only return transactions matching payeeName filter', async () => {
      vi.mocked(fetchTransactionsForAccount).mockResolvedValue([
        {
          id: 'txn-7',
          account: 'acct-1',
          date: '2026-01-15',
          payee: 'payee-uuid-1',
          payee_name: 'Meijer',
          category: 'cat-uuid-1',
          category_name: 'Food',
          amount: -2500,
          notes: '',
          cleared: true,
        },
        {
          id: 'txn-8',
          account: 'acct-1',
          date: '2026-01-16',
          payee: 'payee-uuid-2',
          payee_name: 'Shell',
          category: 'cat-uuid-gas',
          category_name: 'Gas',
          amount: -4000,
          notes: '',
          cleared: true,
        },
      ]);

      const result = await handler({ ...baseArgs, payeeName: 'meijer' });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('txn-7');
      expect(text).not.toContain('txn-8');
    });

    it('should return no transactions when payeeName does not match any', async () => {
      vi.mocked(fetchTransactionsForAccount).mockResolvedValue([
        {
          id: 'txn-9',
          account: 'acct-1',
          date: '2026-01-15',
          payee: 'payee-uuid-1',
          payee_name: 'Meijer',
          category: 'cat-uuid-1',
          category_name: 'Food',
          amount: -2500,
          notes: '',
          cleared: true,
        },
      ]);

      const result = await handler({ ...baseArgs, payeeName: 'nonexistent' });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Matching Transactions: 0/1');
    });
  });

  describe('handler - filtering by categoryName', () => {
    it('should only return transactions matching categoryName filter', async () => {
      vi.mocked(fetchTransactionsForAccount).mockResolvedValue([
        {
          id: 'txn-10',
          account: 'acct-1',
          date: '2026-01-15',
          payee: 'payee-uuid-1',
          payee_name: 'Meijer',
          category: 'cat-uuid-food',
          category_name: 'Food',
          amount: -2500,
          notes: '',
          cleared: true,
        },
        {
          id: 'txn-11',
          account: 'acct-1',
          date: '2026-01-16',
          payee: 'payee-uuid-2',
          payee_name: 'Shell',
          category: 'cat-uuid-gas',
          category_name: 'Gas',
          amount: -4000,
          notes: '',
          cleared: true,
        },
      ]);

      const result = await handler({ ...baseArgs, categoryName: 'food' });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('txn-10');
      expect(text).not.toContain('txn-11');
    });
  });

  describe('handler - validation errors', () => {
    it('should return error when accountId is missing', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handler({} as any);

      expect(result.isError).toBe(true);
      expect(fetchTransactionsForAccount).not.toHaveBeenCalled();
    });
  });
});
