import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  createAccount: vi.fn(),
}));

import { createAccount } from '../../../actual-api.js';

describe('create-account tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and required fields', () => {
      expect(schema.name).toBe('create-account');
      expect(schema.inputSchema.required).toEqual(['name']);
    });
  });

  describe('handler - happy path', () => {
    it('should create an account with name only', async () => {
      vi.mocked(createAccount).mockResolvedValue('test-account-id');

      const result = await handler({ name: 'Test Account' });

      expect(createAccount).toHaveBeenCalledWith({ name: 'Test Account' }, undefined);
      expect(result.isError).toBeUndefined();
      expect((result.content[0] as { text: string }).text).toContain('Successfully created account');
      expect((result.content[0] as { text: string }).text).toContain('test-account-id');
    });

    it('should create an account with all optional fields', async () => {
      vi.mocked(createAccount).mockResolvedValue('acc-456');

      const result = await handler({
        name: 'Savings',
        offBudget: true,
        closed: false,
        initialBalance: 100000,
      });

      expect(createAccount).toHaveBeenCalledWith({ name: 'Savings', offbudget: true, closed: false }, 100000);
      expect(result.isError).toBeUndefined();
    });
  });

  describe('handler - edge cases', () => {
    it('should handle zero initial balance', async () => {
      vi.mocked(createAccount).mockResolvedValue('acc-zero');

      const result = await handler({ name: 'Empty Account', initialBalance: 0 });

      expect(createAccount).toHaveBeenCalledWith({ name: 'Empty Account' }, 0);
      expect(result.isError).toBeUndefined();
    });
  });

  describe('handler - validation errors', () => {
    it('should return error when name is missing', async () => {
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('name is required');
      expect(createAccount).not.toHaveBeenCalled();
    });

    it('should return error when name is not a string', async () => {
      const result = await handler({ name: 123 });

      expect(result.isError).toBe(true);
      expect(createAccount).not.toHaveBeenCalled();
    });
  });

  describe('handler - API errors', () => {
    it('should handle API errors', async () => {
      vi.mocked(createAccount).mockRejectedValue(new Error('Database error'));

      const result = await handler({ name: 'Test' });

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('Database error');
    });
  });
});
