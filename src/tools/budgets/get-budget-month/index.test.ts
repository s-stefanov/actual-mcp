import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  getBudgetMonth: vi.fn(),
}));

import { getBudgetMonth } from '../../../actual-api.js';

const mockBudgetMonth = {
  month: '2025-01',
  incomeAvailable: 500000,
  lastMonthOverspent: 0,
  forNextMonth: 0,
  totalBudgeted: -450000,
  toBudget: 50000,
  categoryGroups: [
    {
      id: 'group-1',
      name: 'Essentials',
      budgeted: 200000,
      spent: -150000,
      balance: 50000,
      categories: [
        { id: 'cat-1', name: 'Groceries', budgeted: 200000, spent: -150000, balance: 50000, carryover: false },
      ],
    },
  ],
};

describe('get-budget-month tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('get-budget-month');
      expect(schema.description).toContain('budget data');
    });

    it('should have inputSchema with required month field', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('handler - happy path', () => {
    it('should return budget data for given month', async () => {
      vi.mocked(getBudgetMonth).mockResolvedValue(mockBudgetMonth);

      const result = await handler({ month: '2025-01' });

      expect(getBudgetMonth).toHaveBeenCalledWith('2025-01');
      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Groceries');
    });
  });

  describe('handler - validation errors', () => {
    it('should return error when month is missing', async () => {
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(getBudgetMonth).not.toHaveBeenCalled();
    });

    it('should return error when month is not a string', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handler({ month: 202501 } as any);

      expect(result.isError).toBe(true);
      expect(getBudgetMonth).not.toHaveBeenCalled();
    });
  });

  describe('handler - API errors', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(getBudgetMonth).mockRejectedValue(new Error('Month not found'));

      const result = await handler({ month: '2025-01' });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Month not found');
    });
  });
});
