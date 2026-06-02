import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  setBudgetAmount: vi.fn(),
}));

import { setBudgetAmount } from '../../../actual-api.js';

describe('set-budget-amount tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('set-budget-amount');
      expect(schema.description).toContain('budgeted amount');
    });

    it('should have inputSchema defined', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('handler - happy path', () => {
    it('should set budget amount and return success message', async () => {
      vi.mocked(setBudgetAmount).mockResolvedValue(undefined);

      const result = await handler({ month: '2025-01', categoryId: 'cat-123', value: 50000 });

      expect(setBudgetAmount).toHaveBeenCalledWith('2025-01', 'cat-123', 50000);
      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('cat-123');
    });

    it('should handle zero value (clearing a budget)', async () => {
      vi.mocked(setBudgetAmount).mockResolvedValue(undefined);

      const result = await handler({ month: '2025-06', categoryId: 'cat-456', value: 0 });

      expect(setBudgetAmount).toHaveBeenCalledWith('2025-06', 'cat-456', 0);
      expect(result.isError).toBeFalsy();
    });
  });

  describe('handler - validation errors', () => {
    it('should return error when month is missing', async () => {
      const result = await handler({ categoryId: 'cat-123', value: 5000 });

      expect(result.isError).toBe(true);
      expect(setBudgetAmount).not.toHaveBeenCalled();
    });

    it('should return error when value is not an integer', async () => {
      const result = await handler({ month: '2025-01', categoryId: 'cat-123', value: 50.5 });

      expect(result.isError).toBe(true);
      expect(setBudgetAmount).not.toHaveBeenCalled();
    });
  });

  describe('handler - API errors', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(setBudgetAmount).mockRejectedValue(new Error('Category not found'));

      const result = await handler({ month: '2025-01', categoryId: 'cat-999', value: 10000 });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Category not found');
    });
  });
});
