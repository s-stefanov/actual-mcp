import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';

vi.mock('../../actual-api.js', () => ({
  deleteTransaction: vi.fn(),
}));

import { deleteTransaction } from '../../actual-api.js';

describe('delete-transaction tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('delete-transaction');
      expect(schema.description).toContain('Delete a transaction');
    });

    it('should have inputSchema defined', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('handler - happy path', () => {
    it('should delete a transaction successfully', async () => {
      vi.mocked(deleteTransaction).mockResolvedValue([{ id: 'txn-123' }]);

      const args = { id: 'txn-123' };
      const result = await handler(args);

      expect(deleteTransaction).toHaveBeenCalledWith('txn-123');
      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');
      expect((result.content[0] as { text: string }).text).toContain('Successfully deleted transaction txn-123');
    });

    it('should handle UUID format transaction id', async () => {
      vi.mocked(deleteTransaction).mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440000' }]);

      const args = { id: '550e8400-e29b-41d4-a716-446655440000' };
      const result = await handler(args);

      expect(deleteTransaction).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(result.isError).toBeUndefined();
    });

    it('should return error when transaction does not exist', async () => {
      vi.mocked(deleteTransaction).mockResolvedValue([]);

      const args = { id: 'txn-nonexistent' };
      const result = await handler(args);

      expect(deleteTransaction).toHaveBeenCalledWith('txn-nonexistent');
      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('not found or already deleted');
    });
  });

  describe('handler - validation errors', () => {
    it('should return error when id is missing', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const args = {} as any;
      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(deleteTransaction).not.toHaveBeenCalled();
    });

    it('should return error when id is not a string', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const args = { id: 123 } as any;
      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(deleteTransaction).not.toHaveBeenCalled();
    });
  });

  describe('handler - API errors', () => {
    it('should handle transaction not found error', async () => {
      vi.mocked(deleteTransaction).mockRejectedValue(new Error('Transaction not found'));

      const args = { id: 'txn-nonexistent' };
      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('Transaction not found');
    });

    it('should handle network error', async () => {
      vi.mocked(deleteTransaction).mockRejectedValue(new Error('Network error'));

      const args = { id: 'txn-123' };
      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('Network error');
    });

    it('should handle API timeout', async () => {
      vi.mocked(deleteTransaction).mockRejectedValue(new Error('Request timeout'));

      const args = { id: 'txn-123' };
      const result = await handler(args);

      expect(result.isError).toBe(true);
    });
  });
});
