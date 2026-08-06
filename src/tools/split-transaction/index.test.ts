// ----------------------------
// SPLIT TRANSACTION TOOL TESTS
// ----------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TransactionEntity } from '@actual-app/core/types/models';
import { handler, schema } from './index.js';
import * as actualApi from '../../actual-api.js';
import type { SplitTransactionArgs } from '../../types.js';
import { textContent } from '../../utils/response.js';

// Mock the actual-api module
vi.mock('../../actual-api.js', () => ({
  getTransactionById: vi.fn(),
  addSplitTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));

const originalTransaction: TransactionEntity = {
  id: 'txn-1',
  account: 'acct-1',
  date: '2026-08-01',
  amount: -4500,
  payee: 'payee-1',
  category: 'cat-original',
  notes: 'Stan’s Merry Mart',
  imported_id: 'imp-1',
  imported_payee: 'STANS MERRY MART',
  cleared: true,
};

const validArgs: SplitTransactionArgs = {
  transactionId: 'txn-1',
  splits: [
    { amount: -2500, category: 'cat-groceries', notes: 'Groceries' },
    { amount: -2000, category: 'cat-gifts', notes: 'Gifts' },
  ],
};

/** Parse the JSON payload returned in the first content item. */
function parseResultJson(result: Awaited<ReturnType<typeof handler>>): Record<string, unknown> {
  return JSON.parse(textContent(result.content[0])) as Record<string, unknown>;
}

describe('split-transaction tool', () => {
  beforeEach(() => {
    // Reason: resetAllMocks (not clearAllMocks) so implementations set by earlier
    // tests do not leak into later ones.
    vi.resetAllMocks();
  });

  describe('schema', () => {
    it('should have correct tool name and description', () => {
      expect(schema.name).toBe('split-transaction');
      expect(schema.description).toContain('Split an existing transaction');
    });

    it('should require transactionId and splits fields', () => {
      expect(schema.inputSchema.required).toEqual(['transactionId', 'splits']);
    });
  });

  describe('handler - success cases', () => {
    it('should split a transaction and delete the original', async () => {
      vi.mocked(actualApi.getTransactionById).mockResolvedValue(originalTransaction);
      vi.mocked(actualApi.addSplitTransaction).mockResolvedValue(['parent-1', 'child-1', 'child-2']);
      vi.mocked(actualApi.deleteTransaction).mockResolvedValue([]);

      const result = await handler(validArgs);

      expect(actualApi.addSplitTransaction).toHaveBeenCalledWith('acct-1', {
        date: '2026-08-01',
        amount: -4500,
        payee: 'payee-1',
        imported_payee: 'STANS MERRY MART',
        notes: 'Stan’s Merry Mart',
        imported_id: 'imp-1',
        cleared: true,
        category: undefined,
        subtransactions: [
          { amount: -2500, category: 'cat-groceries', notes: 'Groceries' },
          { amount: -2000, category: 'cat-gifts', notes: 'Gifts' },
        ],
      });
      expect(actualApi.deleteTransaction).toHaveBeenCalledWith('txn-1');

      const json = parseResultJson(result);
      expect(result.isError).toBeUndefined();
      expect(json.status).toBe('success');
      expect(json.originalTransactionId).toBe('txn-1');
      expect(json.splitTransactionId).toBe('parent-1');
      expect(json.childTransactionIds).toEqual(['child-1', 'child-2']);
    });

    it('should split a transaction with minimal original fields', async () => {
      vi.mocked(actualApi.getTransactionById).mockResolvedValue({
        id: 'txn-min',
        account: 'acct-1',
        date: '2026-08-01',
        amount: 1000,
      });
      vi.mocked(actualApi.addSplitTransaction).mockResolvedValue(['parent-2', 'child-a', 'child-b']);
      vi.mocked(actualApi.deleteTransaction).mockResolvedValue([]);

      const result = await handler({
        transactionId: 'txn-min',
        splits: [{ amount: 400 }, { amount: 600 }],
      });

      expect(result.isError).toBeUndefined();
      expect(actualApi.addSplitTransaction).toHaveBeenCalledWith('acct-1', {
        date: '2026-08-01',
        amount: 1000,
        payee: undefined,
        imported_payee: undefined,
        notes: undefined,
        imported_id: undefined,
        cleared: undefined,
        category: undefined,
        subtransactions: [
          { amount: 400, category: undefined, notes: undefined },
          { amount: 600, category: undefined, notes: undefined },
        ],
      });
    });
  });

  describe('handler - validation errors', () => {
    it('should return error when splits do not sum to the original amount', async () => {
      vi.mocked(actualApi.getTransactionById).mockResolvedValue(originalTransaction);

      const result = await handler({
        transactionId: 'txn-1',
        splits: [{ amount: -2500 }, { amount: -1000 }],
      });

      expect(result.isError).toBe(true);
      expect(textContent(result.content[0])).toContain('-3500');
      expect(textContent(result.content[0])).toContain('-4500');
      expect(actualApi.addSplitTransaction).not.toHaveBeenCalled();
      expect(actualApi.deleteTransaction).not.toHaveBeenCalled();
    });

    it('should return error when fewer than two splits are provided', async () => {
      const result = await handler({
        transactionId: 'txn-1',
        splits: [{ amount: -4500 }],
      });

      expect(result.isError).toBe(true);
      expect(actualApi.getTransactionById).not.toHaveBeenCalled();
    });

    it('should return error when a split amount is not an integer', async () => {
      const result = await handler({
        transactionId: 'txn-1',
        splits: [{ amount: -25.5 }, { amount: -4474.5 }],
      });

      expect(result.isError).toBe(true);
      expect(actualApi.getTransactionById).not.toHaveBeenCalled();
    });

    it('should return error when transactionId is missing', async () => {
      const result = await handler({ splits: validArgs.splits } as unknown as SplitTransactionArgs);

      expect(result.isError).toBe(true);
      expect(textContent(result.content[0])).toContain('transactionId');
    });
  });

  describe('handler - ineligible transactions', () => {
    it('should return error when the transaction does not exist', async () => {
      vi.mocked(actualApi.getTransactionById).mockResolvedValue(null);

      const result = await handler(validArgs);

      expect(result.isError).toBe(true);
      expect(textContent(result.content[0])).toContain('not found');
      expect(actualApi.addSplitTransaction).not.toHaveBeenCalled();
    });

    it('should return error when the transaction is already a split parent', async () => {
      vi.mocked(actualApi.getTransactionById).mockResolvedValue({ ...originalTransaction, is_parent: true });

      const result = await handler(validArgs);

      expect(result.isError).toBe(true);
      expect(textContent(result.content[0])).toContain('already a split parent');
      expect(actualApi.addSplitTransaction).not.toHaveBeenCalled();
    });

    it('should return error pointing at the parent when given a subtransaction', async () => {
      vi.mocked(actualApi.getTransactionById).mockResolvedValue({
        ...originalTransaction,
        is_child: true,
        parent_id: 'parent-9',
      });

      const result = await handler(validArgs);

      expect(result.isError).toBe(true);
      expect(textContent(result.content[0])).toContain('parent-9');
      expect(actualApi.addSplitTransaction).not.toHaveBeenCalled();
    });

    it('should return error when the transaction is reconciled', async () => {
      vi.mocked(actualApi.getTransactionById).mockResolvedValue({ ...originalTransaction, reconciled: true });

      const result = await handler(validArgs);

      expect(result.isError).toBe(true);
      expect(textContent(result.content[0])).toContain('reconciled');
      expect(actualApi.addSplitTransaction).not.toHaveBeenCalled();
    });

    it('should return error when the transaction is one side of a transfer', async () => {
      vi.mocked(actualApi.getTransactionById).mockResolvedValue({ ...originalTransaction, transfer_id: 'txn-xfer' });

      const result = await handler(validArgs);

      expect(result.isError).toBe(true);
      expect(textContent(result.content[0])).toContain('transfer');
      expect(actualApi.addSplitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('handler - failure cases', () => {
    it('should surface API errors from the split creation', async () => {
      vi.mocked(actualApi.getTransactionById).mockResolvedValue(originalTransaction);
      vi.mocked(actualApi.addSplitTransaction).mockRejectedValue(new Error('budget file is locked'));

      const result = await handler(validArgs);

      expect(result.isError).toBe(true);
      expect(textContent(result.content[0])).toContain('budget file is locked');
      expect(actualApi.deleteTransaction).not.toHaveBeenCalled();
    });

    it('should return error when no IDs come back from the split creation', async () => {
      vi.mocked(actualApi.getTransactionById).mockResolvedValue(originalTransaction);
      vi.mocked(actualApi.addSplitTransaction).mockResolvedValue([]);

      const result = await handler(validArgs);

      expect(result.isError).toBe(true);
      expect(textContent(result.content[0])).toContain('could not be created');
      expect(actualApi.deleteTransaction).not.toHaveBeenCalled();
    });

    it('should report a warning with both IDs when deleting the original fails', async () => {
      vi.mocked(actualApi.getTransactionById).mockResolvedValue(originalTransaction);
      vi.mocked(actualApi.addSplitTransaction).mockResolvedValue(['parent-1', 'child-1', 'child-2']);
      vi.mocked(actualApi.deleteTransaction).mockRejectedValue(new Error('delete failed'));

      const result = await handler(validArgs);

      const json = parseResultJson(result);
      expect(result.isError).toBeUndefined();
      expect(json.status).toBe('completed_with_warning');
      expect(json.originalTransactionId).toBe('txn-1');
      expect(json.splitTransactionId).toBe('parent-1');
      expect(String(json.message)).toContain('delete failed');
    });
  });
});
