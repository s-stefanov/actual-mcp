import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({
  updateTransaction: vi.fn(),
  getTransactionById: vi.fn(),
}));

import { updateTransaction, getTransactionById } from '../../actual-api.js';

describe('update-transaction tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: transaction lookup returns null so subtransaction payloads pass
    // through untouched. Conversion tests override this per case.
    vi.mocked(getTransactionById).mockResolvedValue(null);
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('update-transaction');
      expect(schema.description).toContain('Update an existing transaction');
    });

    it('should have inputSchema defined', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('handler - happy path', () => {
    it('should update a transaction with all fields', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        account: 'acc-456',
        date: '2024-01-15',
        amount: -5000,
        payee: 'payee-789',
        category: 'cat-001',
        notes: 'Updated grocery expense',
        cleared: true,
      };

      const result = await handler(args);

      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        account: 'acc-456',
        date: '2024-01-15',
        amount: -5000,
        payee: 'payee-789',
        category: 'cat-001',
        notes: 'Updated grocery expense',
        cleared: true,
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');
      expect((result.content[0] as { text: string }).text).toContain('Successfully updated transaction txn-123');
    });

    it('should update only the date field', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        date: '2024-02-20',
      };

      const result = await handler(args);

      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        date: '2024-02-20',
      });
      expect(result.isError).toBeUndefined();
      expect((result.content[0] as { text: string }).text).toContain('Updated fields: date');
    });

    it('should update only the amount field', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        amount: -10050,
      };

      const result = await handler(args);

      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        amount: -10050,
      });
      expect((result.content[0] as { text: string }).text).toContain('Updated fields: amount');
    });

    it('should update with payee_name to create new payee', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        payee_name: 'New Grocery Store',
      };

      const result = await handler(args);

      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        payee_name: 'New Grocery Store',
      });
      expect(result.isError).toBeUndefined();
    });

    it('should update imported_payee field', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        imported_payee: 'AMAZON MKTPLACE PMTS',
      };

      await handler(args);

      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        imported_payee: 'AMAZON MKTPLACE PMTS',
      });
    });

    it('should update imported_id field', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        imported_id: 'BANK-TXN-ABC123',
      };

      await handler(args);

      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        imported_id: 'BANK-TXN-ABC123',
      });
    });

    it('should update cleared status to false', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        cleared: false,
      };

      await handler(args);

      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        cleared: false,
      });
    });

    it('should update account to move transaction', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        account: 'new-account-456',
      };

      await handler(args);

      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        account: 'new-account-456',
      });
    });

    it('should update with subtransactions for split transaction', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        subtransactions: [
          { amount: -3000, category: 'cat-groceries', notes: 'Food items' },
          { amount: -2000, category: 'cat-household', notes: 'Cleaning supplies' },
        ],
      };

      const result = await handler(args);

      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        subtransactions: [
          { amount: -3000, category: 'cat-groceries', notes: 'Food items' },
          { amount: -2000, category: 'cat-household', notes: 'Cleaning supplies' },
        ],
      });
      expect(result.isError).toBeUndefined();
    });

    it('should update multiple fields at once', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        date: '2024-03-01',
        amount: -7500,
        category: 'cat-entertainment',
        notes: 'Movie tickets',
        cleared: true,
      };

      const result = await handler(args);

      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        date: '2024-03-01',
        amount: -7500,
        category: 'cat-entertainment',
        notes: 'Movie tickets',
        cleared: true,
      });
      expect((result.content[0] as { text: string }).text).toContain('Updated fields:');
    });
  });

  describe('handler - split conversion', () => {
    it('should convert a plain transaction into a split', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);
      vi.mocked(getTransactionById).mockResolvedValue({
        id: 'txn-123',
        account: 'acc-parent',
        date: '2024-05-01',
        amount: -5000,
        is_parent: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const args = {
        id: 'txn-123',
        subtransactions: [
          { amount: -3000, category: 'cat-groceries' },
          { amount: -2000, category: 'cat-household', notes: 'Soap' },
        ],
      };

      const result = await handler(args);

      expect(getTransactionById).toHaveBeenCalledWith('txn-123');
      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        is_parent: true,
        category: null,
        subtransactions: [
          {
            id: expect.any(String),
            account: 'acc-parent',
            date: '2024-05-01',
            amount: -3000,
            parent_id: 'txn-123',
            is_child: true,
            sort_order: 0,
            category: 'cat-groceries',
          },
          {
            id: expect.any(String),
            account: 'acc-parent',
            date: '2024-05-01',
            amount: -2000,
            parent_id: 'txn-123',
            is_child: true,
            sort_order: -1,
            category: 'cat-household',
            notes: 'Soap',
          },
        ],
      });
      expect(result.isError).toBeUndefined();
      // Confirmation reflects the caller-facing field, not the rewritten internals.
      expect((result.content[0] as { text: string }).text).toContain('Updated fields: subtransactions');
    });

    it('should give children a moved account and new date when provided on the update', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);
      vi.mocked(getTransactionById).mockResolvedValue({
        id: 'txn-123',
        account: 'acc-old',
        date: '2024-05-01',
        amount: -5000,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await handler({
        id: 'txn-123',
        account: 'acc-new',
        date: '2024-06-15',
        subtransactions: [{ amount: -5000, category: 'cat-x' }],
      });

      const [, payload] = vi.mocked(updateTransaction).mock.calls[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const children = (payload as any).subtransactions;
      expect(children[0]).toMatchObject({
        account: 'acc-new',
        date: '2024-06-15',
        parent_id: 'txn-123',
        is_child: true,
      });
    });

    it('should propagate the parent payee to converted children', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);
      vi.mocked(getTransactionById).mockResolvedValue({
        id: 'txn-123',
        account: 'acc-parent',
        date: '2024-05-01',
        amount: -5000,
        payee: 'payee-parent',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await handler({
        id: 'txn-123',
        subtransactions: [
          { amount: -3000, category: 'cat-a' },
          { amount: -2000, category: 'cat-b' },
        ],
      });

      const [, payload] = vi.mocked(updateTransaction).mock.calls[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const children = (payload as any).subtransactions;
      expect(children.map((c: { payee?: string }) => c.payee)).toEqual(['payee-parent', 'payee-parent']);
    });

    it('should propagate a payee newly set on the update to children', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);
      vi.mocked(getTransactionById).mockResolvedValue({
        id: 'txn-123',
        account: 'acc-parent',
        date: '2024-05-01',
        amount: -5000,
        payee: 'payee-old',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await handler({
        id: 'txn-123',
        payee: 'payee-new',
        subtransactions: [{ amount: -5000, category: 'cat-a' }],
      });

      const [, payload] = vi.mocked(updateTransaction).mock.calls[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((payload as any).subtransactions[0].payee).toBe('payee-new');
    });

    it('should preserve caller-provided subtransaction ids when converting', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);
      vi.mocked(getTransactionById).mockResolvedValue({
        id: 'txn-123',
        account: 'acc-parent',
        date: '2024-05-01',
        amount: -1000,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await handler({
        id: 'txn-123',
        subtransactions: [{ id: 'keep-me', amount: -1000, category: 'cat-a' }],
      });

      const [, payload] = vi.mocked(updateTransaction).mock.calls[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((payload as any).subtransactions[0].id).toBe('keep-me');
    });

    it('should pass subtransactions through unchanged for an already-split transaction', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);
      vi.mocked(getTransactionById).mockResolvedValue({
        id: 'txn-123',
        account: 'acc-parent',
        date: '2024-05-01',
        amount: -5000,
        is_parent: true,
        subtransactions: [{ id: 'child-1', amount: -5000 }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await handler({
        id: 'txn-123',
        subtransactions: [
          { id: 'child-1', amount: -3000, category: 'cat-a' },
          { amount: -2000, category: 'cat-b' },
        ],
      });

      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        subtransactions: [
          { id: 'child-1', amount: -3000, category: 'cat-a' },
          { amount: -2000, category: 'cat-b' },
        ],
      });
    });

    it('should reject a split whose amounts do not sum to the existing total', async () => {
      vi.mocked(getTransactionById).mockResolvedValue({
        id: 'txn-123',
        account: 'acc-parent',
        date: '2024-05-01',
        amount: -5000,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await handler({
        id: 'txn-123',
        subtransactions: [
          { amount: -3000, category: 'cat-a' },
          { amount: -1000, category: 'cat-b' },
        ],
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('must sum to the transaction total');
      expect(text).toContain('-4000');
      expect(text).toContain('-5000');
      expect(updateTransaction).not.toHaveBeenCalled();
    });

    it('should validate against a new amount set on the same update', async () => {
      vi.mocked(getTransactionById).mockResolvedValue({
        id: 'txn-123',
        account: 'acc-parent',
        date: '2024-05-01',
        amount: -5000,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await handler({
        id: 'txn-123',
        amount: -4000,
        subtransactions: [
          { amount: -3000, category: 'cat-a' },
          { amount: -1000, category: 'cat-b' },
        ],
      });

      // Children sum to -4000, which matches the new amount even though it
      // differs from the old total, so the update should proceed.
      expect(result.isError).toBeUndefined();
      expect(updateTransaction).toHaveBeenCalled();
    });

    it('should reject a mismatched split on an already-split transaction', async () => {
      vi.mocked(getTransactionById).mockResolvedValue({
        id: 'txn-123',
        account: 'acc-parent',
        date: '2024-05-01',
        amount: -5000,
        is_parent: true,
        subtransactions: [{ id: 'child-1', amount: -5000 }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await handler({
        id: 'txn-123',
        subtransactions: [
          { id: 'child-1', amount: -3000, category: 'cat-a' },
          { amount: -1000, category: 'cat-b' },
        ],
      });

      expect(result.isError).toBe(true);
      expect(updateTransaction).not.toHaveBeenCalled();
    });

    it('should not validate when the total cannot be determined', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);
      // Transaction can't be loaded and no amount supplied → total unknown.
      vi.mocked(getTransactionById).mockResolvedValue(null);

      const result = await handler({
        id: 'txn-123',
        subtransactions: [{ amount: -3000, category: 'cat-a' }],
      });

      expect(result.isError).toBeUndefined();
      expect(updateTransaction).toHaveBeenCalled();
    });

    it('should not look up the transaction when no subtransactions are provided', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      await handler({ id: 'txn-123', amount: -1000 });

      expect(getTransactionById).not.toHaveBeenCalled();
    });

    it('should leave the payload untouched when the transaction cannot be loaded', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);
      vi.mocked(getTransactionById).mockResolvedValue(null);

      await handler({
        id: 'txn-missing',
        subtransactions: [{ amount: -1000, category: 'cat-a' }],
      });

      expect(updateTransaction).toHaveBeenCalledWith('txn-missing', {
        subtransactions: [{ amount: -1000, category: 'cat-a' }],
      });
    });
  });

  describe('handler - edge cases', () => {
    it('should handle zero amount', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        amount: 0,
      };

      const result = await handler(args);

      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        amount: 0,
      });
      expect(result.isError).toBeUndefined();
    });

    it('should handle positive amount (income)', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        amount: 150000,
      };

      await handler(args);

      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        amount: 150000,
      });
    });

    it('should handle empty notes string', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        notes: '',
      };

      await handler(args);

      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        notes: '',
      });
    });

    it('should handle subtransaction with only required amount field', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        subtransactions: [{ amount: -5000 }],
      };

      await handler(args);

      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        subtransactions: [{ amount: -5000 }],
      });
    });

    it('should handle empty subtransactions array to clear splits', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        subtransactions: [],
      };

      await handler(args);

      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        subtransactions: [],
      });
    });
  });

  describe('handler - validation errors', () => {
    it('should return error when no fields are provided to update', async () => {
      const args = {
        id: 'txn-123',
      };

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('No fields provided to update');
      expect(updateTransaction).not.toHaveBeenCalled();
    });

    it('should return error for invalid date format', async () => {
      const args = {
        id: 'txn-123',
        date: '01-15-2024', // Wrong format
      };

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(updateTransaction).not.toHaveBeenCalled();
    });

    it('should return error for missing transaction id', async () => {
      const args = {
        amount: -5000,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(updateTransaction).not.toHaveBeenCalled();
    });

    it('should return error for invalid date format with slashes', async () => {
      const args = {
        id: 'txn-123',
        date: '2024/01/15',
      };

      const result = await handler(args);

      expect(result.isError).toBe(true);
    });

    it('should return error for subtransaction missing amount', async () => {
      const args = {
        id: 'txn-123',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subtransactions: [{ category: 'cat-123' }] as any,
      };

      const result = await handler(args);

      expect(result.isError).toBe(true);
    });
  });

  describe('handler - API errors', () => {
    it('should handle API error gracefully', async () => {
      vi.mocked(updateTransaction).mockRejectedValue(new Error('Transaction not found'));

      const args = {
        id: 'txn-nonexistent',
        amount: -5000,
      };

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('Transaction not found');
    });

    it('should handle API network error', async () => {
      vi.mocked(updateTransaction).mockRejectedValue(new Error('Network error'));

      const args = {
        id: 'txn-123',
        date: '2024-01-15',
      };

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('Network error');
    });

    it('should handle API timeout', async () => {
      vi.mocked(updateTransaction).mockRejectedValue(new Error('Request timeout'));

      const args = {
        id: 'txn-123',
        amount: -1000,
      };

      const result = await handler(args);

      expect(result.isError).toBe(true);
    });
  });

  describe('handler - field filtering', () => {
    it('should only include explicitly provided fields in update', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        amount: -5000,
        // Other fields are intentionally not provided
      };

      await handler(args);

      // Should only have amount in the update call, not other undefined fields
      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        amount: -5000,
      });

      // Verify no undefined fields were passed
      const callArgs = vi.mocked(updateTransaction).mock.calls[0][1];
      expect(Object.keys(callArgs)).toEqual(['amount']);
    });

    it('should filter undefined but preserve falsy values (0, false, empty string)', async () => {
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const args = {
        id: 'txn-123',
        amount: 0, // falsy but valid
        cleared: false, // falsy but valid
        notes: '', // falsy but valid
        // These are undefined and should be filtered out:
        // date: undefined,
        // payee: undefined,
        // category: undefined,
      };

      await handler(args);

      // All falsy values should be included
      expect(updateTransaction).toHaveBeenCalledWith('txn-123', {
        amount: 0,
        cleared: false,
        notes: '',
      });

      // Verify exactly these fields and no undefined ones
      const callArgs = vi.mocked(updateTransaction).mock.calls[0][1];
      expect(Object.keys(callArgs).sort()).toEqual(['amount', 'cleared', 'notes'].sort());
      expect(callArgs).not.toHaveProperty('date');
      expect(callArgs).not.toHaveProperty('payee');
      expect(callArgs).not.toHaveProperty('category');
    });
  });
});
