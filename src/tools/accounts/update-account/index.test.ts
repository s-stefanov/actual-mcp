import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  updateAccount: vi.fn(),
}));

import { updateAccount } from '../../../actual-api.js';

describe('update-account tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and required fields', () => {
      expect(schema.name).toBe('update-account');
      expect(schema.inputSchema.required).toEqual(['id']);
    });
  });

  describe('handler - happy path', () => {
    it('should rename an account', async () => {
      vi.mocked(updateAccount).mockResolvedValue(undefined);

      const result = await handler({ id: 'acc-123', name: 'New Name' });

      expect(updateAccount).toHaveBeenCalledWith('acc-123', { name: 'New Name' });
      expect(result.isError).toBeUndefined();
      expect((result.content[0] as { text: string }).text).toContain('Successfully updated account');
    });

    it('should update offBudget status', async () => {
      vi.mocked(updateAccount).mockResolvedValue(undefined);

      const result = await handler({ id: 'acc-123', offBudget: true });

      expect(updateAccount).toHaveBeenCalledWith('acc-123', { offbudget: true });
      expect(result.isError).toBeUndefined();
    });
  });

  describe('handler - validation errors', () => {
    it('should return error when id is missing', async () => {
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(updateAccount).not.toHaveBeenCalled();
    });

    it('should return error when no fields to update', async () => {
      const result = await handler({ id: 'acc-123' });

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('At least one field');
      expect(updateAccount).not.toHaveBeenCalled();
    });
  });

  describe('handler - API errors', () => {
    it('should handle API errors', async () => {
      vi.mocked(updateAccount).mockRejectedValue(new Error('Account not found'));

      const result = await handler({ id: 'acc-123', name: 'Test' });

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('Account not found');
    });
  });
});
