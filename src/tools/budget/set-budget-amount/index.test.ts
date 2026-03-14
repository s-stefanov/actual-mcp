import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  setBudgetAmount: vi.fn(),
}));

import { handler, schema } from './index.js';
import { setBudgetAmount } from '../../../actual-api.js';

describe('set-budget-amount tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name', () => {
      expect(schema.name).toBe('set-budget-amount');
    });

    it('should require month, categoryId, and amount', () => {
      expect(schema.inputSchema.required).toContain('month');
      expect(schema.inputSchema.required).toContain('categoryId');
      expect(schema.inputSchema.required).toContain('amount');
    });
  });

  describe('handler - happy path', () => {
    it('should call setBudgetAmount with amount converted to cents', async () => {
      vi.mocked(setBudgetAmount).mockResolvedValue(undefined);

      const result = await handler({ month: '2026-03', categoryId: 'abc-123', amount: 150.5 });

      expect(result.isError).toBeUndefined();
      expect(setBudgetAmount).toHaveBeenCalledWith('2026-03', 'abc-123', 15050);
    });

    it('should correctly round float amounts to cents', async () => {
      vi.mocked(setBudgetAmount).mockResolvedValue(undefined);

      const result = await handler({ month: '2026-03', categoryId: 'abc-123', amount: 19.99 });

      expect(result.isError).toBeUndefined();
      expect(setBudgetAmount).toHaveBeenCalledWith('2026-03', 'abc-123', 1999);
    });
  });

  describe('handler - validation', () => {
    it('should return error when month is missing', async () => {
      const result = await handler({ categoryId: 'abc-123', amount: 100 });

      expect(result.isError).toBe(true);
      expect(setBudgetAmount).not.toHaveBeenCalled();
    });

    it('should return error when categoryId is missing', async () => {
      const result = await handler({ month: '2026-03', amount: 100 });

      expect(result.isError).toBe(true);
      expect(setBudgetAmount).not.toHaveBeenCalled();
    });

    it('should return error when amount is missing', async () => {
      const result = await handler({ month: '2026-03', categoryId: 'abc-123' });

      expect(result.isError).toBe(true);
      expect(setBudgetAmount).not.toHaveBeenCalled();
    });

    it('should return error for bad month format', async () => {
      const result = await handler({ month: 'March 2026', categoryId: 'abc-123', amount: 100 });

      expect(result.isError).toBe(true);
      expect(setBudgetAmount).not.toHaveBeenCalled();
    });
  });

  describe('handler - error', () => {
    it('should return error when setBudgetAmount throws', async () => {
      vi.mocked(setBudgetAmount).mockRejectedValue(new Error('API error'));

      const result = await handler({ month: '2026-03', categoryId: 'abc-123', amount: 100 });

      expect(result.isError).toBe(true);
    });
  });
});
