import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  setBudgetAmount: vi.fn(),
}));

import { handler, schema } from './index.js';
import { setBudgetAmount } from '../../../actual-api.js';

describe('set-budget-month tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and required fields', () => {
      expect(schema.name).toBe('set-budget-month');
      expect(schema.inputSchema.required).toContain('month');
      expect(schema.inputSchema.required).toContain('budgets');
    });
  });

  describe('handler - happy path', () => {
    it('should set multiple category budgets and return count', async () => {
      vi.mocked(setBudgetAmount).mockResolvedValue(undefined);

      const result = await handler({
        month: '2026-03',
        budgets: [
          { categoryId: 'food-id', amount: 600 },
          { categoryId: 'gas-id', amount: 200 },
          { categoryId: 'bills-id', amount: 1500.5 },
        ],
      });

      expect(result.isError).toBeUndefined();
      const content = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(content.set).toBe(3);
      expect(content.errors).toEqual([]);
      expect(setBudgetAmount).toHaveBeenCalledTimes(3);
      expect(setBudgetAmount).toHaveBeenCalledWith('2026-03', 'food-id', 60000);
      expect(setBudgetAmount).toHaveBeenCalledWith('2026-03', 'gas-id', 20000);
      expect(setBudgetAmount).toHaveBeenCalledWith('2026-03', 'bills-id', 150050);
    });
  });

  describe('handler - validation', () => {
    it('should return error when month is missing', async () => {
      const result = await handler({ budgets: [{ categoryId: 'a', amount: 1 }] });
      expect(result.isError).toBe(true);
    });

    it('should return error when budgets is empty', async () => {
      const result = await handler({ month: '2026-03', budgets: [] });
      expect(result.isError).toBe(true);
    });

    it('should skip entries with invalid categoryId and report errors', async () => {
      vi.mocked(setBudgetAmount).mockResolvedValue(undefined);

      const result = await handler({
        month: '2026-03',
        budgets: [
          { categoryId: '', amount: 100 },
          { categoryId: 'valid-id', amount: 200 },
        ],
      });

      const content = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(content.set).toBe(1);
      expect(content.errors).toHaveLength(1);
    });
  });

  describe('handler - error', () => {
    it('should collect per-entry errors without stopping', async () => {
      vi.mocked(setBudgetAmount)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce(undefined);

      const result = await handler({
        month: '2026-03',
        budgets: [
          { categoryId: 'a', amount: 100 },
          { categoryId: 'b', amount: 200 },
          { categoryId: 'c', amount: 300 },
        ],
      });

      const content = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(content.set).toBe(2);
      expect(content.errors).toHaveLength(1);
      expect(content.errors[0]).toContain('API error');
    });
  });
});
