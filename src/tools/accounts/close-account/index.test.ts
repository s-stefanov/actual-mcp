import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  closeAccount: vi.fn(),
  reopenAccount: vi.fn(),
}));

import { closeAccount, reopenAccount } from '../../../actual-api.js';

describe('close-account tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and required fields', () => {
      expect(schema.name).toBe('close-account');
      expect(schema.inputSchema.required).toEqual(['id']);
    });
  });

  describe('handler - close', () => {
    it('should close an account', async () => {
      vi.mocked(closeAccount).mockResolvedValue(undefined);

      const result = await handler({ id: 'acc-123' });

      expect(closeAccount).toHaveBeenCalledWith('acc-123', undefined, undefined);
      expect(result.isError).toBeUndefined();
      expect((result.content[0] as { text: string }).text).toContain('Successfully closed account');
    });

    it('should close with balance transfer', async () => {
      vi.mocked(closeAccount).mockResolvedValue(undefined);

      const result = await handler({
        id: 'acc-123',
        transferAccountId: 'acc-456',
        transferCategoryId: 'cat-789',
      });

      expect(closeAccount).toHaveBeenCalledWith('acc-123', 'acc-456', 'cat-789');
      expect(result.isError).toBeUndefined();
    });
  });

  describe('handler - reopen', () => {
    it('should reopen a closed account', async () => {
      vi.mocked(reopenAccount).mockResolvedValue(undefined);

      const result = await handler({ id: 'acc-123', reopen: true });

      expect(reopenAccount).toHaveBeenCalledWith('acc-123');
      expect(closeAccount).not.toHaveBeenCalled();
      expect((result.content[0] as { text: string }).text).toContain('Successfully reopened account');
    });
  });

  describe('handler - validation errors', () => {
    it('should return error when id is missing', async () => {
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(closeAccount).not.toHaveBeenCalled();
      expect(reopenAccount).not.toHaveBeenCalled();
    });
  });

  describe('handler - API errors', () => {
    it('should handle API errors', async () => {
      vi.mocked(closeAccount).mockRejectedValue(new Error('Account not found'));

      const result = await handler({ id: 'acc-123' });

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('Account not found');
    });
  });
});
