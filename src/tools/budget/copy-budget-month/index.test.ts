import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  getBudgetMonth: vi.fn(),
  setBudgetAmount: vi.fn(),
}));

import { handler, schema } from './index.js';
import { getBudgetMonth, setBudgetAmount } from '../../../actual-api.js';

const mockBudgetData = {
  month: '2026-02',
  categoryGroups: [
    {
      id: 'group-1',
      name: 'Usual Expenses',
      categories: [
        { id: 'food-id', budgeted: 60000 },
        { id: 'gas-id', budgeted: 20000 },
        { id: 'zero-id', budgeted: 0 },
      ],
    },
    {
      id: 'group-2',
      name: 'Income',
      categories: [{ id: 'income-id', budgeted: 500000 }],
    },
  ],
};

describe('copy-budget-month tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and required fields', () => {
      expect(schema.name).toBe('copy-budget-month');
      expect(schema.inputSchema.required).toContain('sourceMonth');
      expect(schema.inputSchema.required).toContain('targetMonths');
    });
  });

  describe('handler - happy path', () => {
    it('should copy non-zero budgets from source to target months', async () => {
      vi.mocked(getBudgetMonth).mockResolvedValue(mockBudgetData);
      vi.mocked(setBudgetAmount).mockResolvedValue(undefined);

      const result = await handler({
        sourceMonth: '2026-02',
        targetMonths: ['2026-03'],
      });

      expect(result.isError).toBeUndefined();
      const content = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(content.categoriesCopied).toBe(3); // food, gas, income (not zero-id)
      expect(content.results).toEqual([{ month: '2026-03', set: 3 }]);
      expect(content.errors).toEqual([]);
      expect(setBudgetAmount).toHaveBeenCalledWith('2026-03', 'food-id', 60000);
      expect(setBudgetAmount).toHaveBeenCalledWith('2026-03', 'gas-id', 20000);
      expect(setBudgetAmount).toHaveBeenCalledWith('2026-03', 'income-id', 500000);
    });

    it('should copy to multiple target months', async () => {
      vi.mocked(getBudgetMonth).mockResolvedValue(mockBudgetData);
      vi.mocked(setBudgetAmount).mockResolvedValue(undefined);

      const result = await handler({
        sourceMonth: '2026-02',
        targetMonths: ['2026-03', '2026-04'],
      });

      const content = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(content.results).toHaveLength(2);
      // 3 categories * 2 months = 6 calls
      expect(setBudgetAmount).toHaveBeenCalledTimes(6);
    });
  });

  describe('handler - validation', () => {
    it('should return error when sourceMonth is missing', async () => {
      const result = await handler({ targetMonths: ['2026-03'] });
      expect(result.isError).toBe(true);
    });

    it('should return error when targetMonths is empty', async () => {
      const result = await handler({ sourceMonth: '2026-02', targetMonths: [] });
      expect(result.isError).toBe(true);
    });

    it('should return error for invalid target month format', async () => {
      const result = await handler({ sourceMonth: '2026-02', targetMonths: ['March'] });
      expect(result.isError).toBe(true);
    });
  });

  describe('handler - error', () => {
    it('should collect errors from failed setBudgetAmount calls', async () => {
      vi.mocked(getBudgetMonth).mockResolvedValue(mockBudgetData);
      vi.mocked(setBudgetAmount)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce(undefined);

      const result = await handler({
        sourceMonth: '2026-02',
        targetMonths: ['2026-03'],
      });

      const content = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(content.results[0].set).toBe(2);
      expect(content.errors).toHaveLength(1);
      expect(content.errors[0]).toContain('API error');
    });
  });
});
