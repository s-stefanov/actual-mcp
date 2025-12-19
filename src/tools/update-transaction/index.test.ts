import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({
  updateTransaction: vi.fn(),
}));

import { updateTransaction } from '../../actual-api.js';

describe('update-transaction tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      const result = await handler(args);

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

      const result = await handler(args);

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

      const result = await handler(args);

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

      const result = await handler(args);

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

      const result = await handler(args);

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

      const result = await handler(args);

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

      const result = await handler(args);

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

      const result = await handler(args);

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

      const result = await handler(args);

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

      const result = await handler(args);

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
