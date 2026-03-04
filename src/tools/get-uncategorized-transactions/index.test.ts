import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
  getPayees: vi.fn(),
}));

import { handler, schema } from './index.js';
import { getAccounts, getTransactions, getPayees } from '../../actual-api.js';
import { textContent } from '../../utils/response.js';

describe('get-uncategorized-transactions tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPayees).mockResolvedValue([] as never);
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('get-uncategorized-transactions');
      expect(schema.description).toContain('uncategorized');
    });

    it('should have inputSchema defined', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('handler - happy path', () => {
    it('should return only uncategorized transactions across on-budget accounts', async () => {
      vi.mocked(getAccounts).mockResolvedValue([
        { id: 'acct-1', name: 'Checking', offbudget: false } as never,
        { id: 'acct-2', name: 'Savings', offbudget: false } as never,
      ]);

      vi.mocked(getPayees).mockResolvedValue([
        { id: 'payee-1', name: 'Walmart' },
        { id: 'payee-2', name: 'Amazon' },
        { id: 'payee-3', name: 'Target' },
      ] as never);

      vi.mocked(getTransactions)
        .mockResolvedValueOnce([
          {
            id: 'txn-1',
            account: 'acct-1',
            date: '2024-01-15',
            amount: -5000,
            payee: 'payee-1',
            category: null,
            notes: '',
            cleared: true,
          } as never,
          {
            id: 'txn-2',
            account: 'acct-1',
            date: '2024-01-16',
            amount: -3000,
            payee: 'payee-2',
            category: 'cat-1',
            notes: '',
            cleared: true,
          } as never,
        ])
        .mockResolvedValueOnce([
          {
            id: 'txn-3',
            account: 'acct-2',
            date: '2024-01-17',
            amount: -1000,
            payee: 'payee-3',
            category: undefined,
            notes: 'lunch',
            cleared: false,
          } as never,
        ]);

      const result = await handler({});

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('2');
      expect(text).toContain('txn-1');
      expect(text).toContain('txn-3');
      expect(text).not.toContain('txn-2');
      // account names enriched
      expect(text).toContain('Checking');
      expect(text).toContain('Savings');
      // payee UUIDs resolved to names
      expect(text).toContain('Walmart');
      expect(text).toContain('Target');
    });
  });

  describe('handler - all categorized', () => {
    it('should return no-results message when all transactions have categories', async () => {
      vi.mocked(getAccounts).mockResolvedValue([{ id: 'acct-1', name: 'Checking', offbudget: false } as never]);
      vi.mocked(getTransactions).mockResolvedValue([
        {
          id: 'txn-1',
          account: 'acct-1',
          date: '2024-01-15',
          amount: -5000,
          payee: 'payee-1',
          category: 'cat-food',
          notes: '',
          cleared: true,
        } as never,
      ]);

      const result = await handler({});

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text.toLowerCase()).toContain('no uncategorized');
    });
  });

  describe('handler - date range', () => {
    it('should pass custom startDate and endDate to getTransactions', async () => {
      vi.mocked(getAccounts).mockResolvedValue([{ id: 'acct-1', name: 'Checking', offbudget: false } as never]);
      vi.mocked(getTransactions).mockResolvedValue([]);

      await handler({ startDate: '2024-01-01', endDate: '2024-03-31' });

      expect(getTransactions).toHaveBeenCalledWith('acct-1', '2024-01-01', '2024-03-31');
    });

    it('should use default dates when none provided', async () => {
      vi.mocked(getAccounts).mockResolvedValue([{ id: 'acct-1', name: 'Checking', offbudget: false } as never]);
      vi.mocked(getTransactions).mockResolvedValue([]);

      await handler({});

      const calls = vi.mocked(getTransactions).mock.calls;
      expect(calls.length).toBe(1);
      // dates should be YYYY-MM-DD strings
      const [, start, end] = calls[0];
      expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // start should be before end
      expect(new Date(start) < new Date(end)).toBe(true);
    });
  });

  describe('handler - off-budget filtering', () => {
    it('should include on-budget accounts and exclude off-budget ones', async () => {
      vi.mocked(getAccounts).mockResolvedValue([
        { id: 'acct-on', name: 'Checking', offbudget: false } as never,
        { id: 'acct-off', name: '401k', offbudget: true } as never,
      ]);
      vi.mocked(getTransactions).mockResolvedValue([]);

      await handler({});

      // should only fetch transactions for the on-budget account
      expect(getTransactions).toHaveBeenCalledTimes(1);
      expect(getTransactions).toHaveBeenCalledWith('acct-on', expect.any(String), expect.any(String));
      expect(getTransactions).not.toHaveBeenCalledWith('acct-off', expect.any(String), expect.any(String));
    });
  });

  describe('handler - empty accounts', () => {
    it('should return an appropriate message when there are no on-budget accounts', async () => {
      vi.mocked(getAccounts).mockResolvedValue([]);

      const result = await handler({});

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text.toLowerCase()).toContain('no uncategorized');
    });
  });

  describe('handler - API error', () => {
    it('should return an error response when getAccounts throws', async () => {
      vi.mocked(getAccounts).mockRejectedValue(new Error('Connection refused'));

      const result = await handler({});

      expect(result.isError).toBe(true);
      const text = textContent(result.content[0]);
      expect(text).toContain('Connection refused');
    });
  });

  describe('handler - empty category string', () => {
    it('should treat empty string category as uncategorized', async () => {
      vi.mocked(getAccounts).mockResolvedValue([{ id: 'acct-1', name: 'Checking', offbudget: false } as never]);
      vi.mocked(getTransactions).mockResolvedValue([
        {
          id: 'txn-empty',
          account: 'acct-1',
          date: '2024-01-15',
          amount: -2000,
          payee: 'payee-x',
          category: '',
          notes: '',
          cleared: true,
        } as never,
      ]);

      const result = await handler({});

      expect(result.isError).toBeUndefined();
      const text = textContent(result.content[0]);
      expect(text).toContain('txn-empty');
    });
  });
});
