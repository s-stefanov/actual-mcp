import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({
  updateTransaction: vi.fn(),
}));

import { handler, schema } from './index.js';
import { updateTransaction } from '../../actual-api.js';

describe('bulk-update-transactions tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('bulk-update-transactions');
      expect(schema.description).toContain('Update multiple transactions');
    });

    it('should have inputSchema defined', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('handler - happy path', () => {
    it('should update 3 transactions and report all successful', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        transactions: [
          { id: 'txn-1', category: 'cat-food' },
          { id: 'txn-2', category: 'cat-gas' },
          { id: 'txn-3', notes: 'updated' },
        ],
      };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('3 updated');
      expect(text).toContain('0 errors');
      expect(updateTransaction).toHaveBeenCalledTimes(3);
    });

    it('should call updateTransaction with id separated from update data', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        transactions: [{ id: 'txn-99', category: 'cat-bills', notes: 'rent' }],
      };

      await handler(args);

      expect(updateTransaction).toHaveBeenCalledWith('txn-99', {
        category: 'cat-bills',
        notes: 'rent',
      });
    });

    it('should handle single field update (only category)', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        transactions: [{ id: 'txn-42', category: 'cat-shopping' }],
      };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      expect(updateTransaction).toHaveBeenCalledWith('txn-42', {
        category: 'cat-shopping',
      });
      // id must not be in the data passed to updateTransaction
      const callData = vi.mocked(updateTransaction).mock.calls[0][1];
      expect(callData).not.toHaveProperty('id');
    });
  });

  describe('handler - partial failure', () => {
    it('should report 2 successes and 1 error when one transaction throws', async () => {
      vi.mocked(updateTransaction)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Transaction not found'))
        .mockResolvedValueOnce(undefined);

      const args = {
        transactions: [
          { id: 'txn-1', category: 'cat-food' },
          { id: 'txn-bad', category: 'cat-food' },
          { id: 'txn-3', category: 'cat-gas' },
        ],
      };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('2 updated');
      expect(text).toContain('1 error');
      expect(text).toContain('txn-bad');
      expect(text).toContain('Transaction not found');
    });
  });

  describe('handler - all fail', () => {
    it('should report 0 successes and 2 errors when all transactions throw', async () => {
      vi.mocked(updateTransaction)
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Permission denied'));

      const args = {
        transactions: [
          { id: 'txn-a', category: 'cat-food' },
          { id: 'txn-b', notes: 'test' },
        ],
      };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('0 updated');
      expect(text).toContain('2 errors');
      expect(text).toContain('txn-a');
      expect(text).toContain('txn-b');
    });
  });

  describe('handler - empty fields guard', () => {
    it('should report 0 updated and 1 error when transaction has no update fields', async () => {
      const args = { transactions: [{ id: 'txn-1' }] };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('0 updated');
      expect(text).toContain('1 error');
      expect(text).toContain('No update fields provided');
      expect(updateTransaction).not.toHaveBeenCalled();
    });
  });

  describe('handler - validation errors', () => {
    it('should return error for empty transactions array', async () => {
      const args = { transactions: [] };

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(updateTransaction).not.toHaveBeenCalled();
    });

    it('should return error when transactions is missing', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const args = {} as any;

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(updateTransaction).not.toHaveBeenCalled();
    });
  });
});
