import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  setBudgetCarryover: vi.fn(),
}));

import { handler, schema } from './index.js';
import { setBudgetCarryover } from '../../../actual-api.js';

describe('set-budget-carryover tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name', () => {
      expect(schema.name).toBe('set-budget-carryover');
    });

    it('should require month, categoryId, and carryover', () => {
      expect(schema.inputSchema.required).toContain('month');
      expect(schema.inputSchema.required).toContain('categoryId');
      expect(schema.inputSchema.required).toContain('carryover');
    });
  });

  describe('handler - happy path', () => {
    it('should call setBudgetCarryover with correct args', async () => {
      vi.mocked(setBudgetCarryover).mockResolvedValue(undefined);

      const result = await handler({ month: '2026-03', categoryId: 'abc-123', carryover: true });

      expect(result.isError).toBeUndefined();
      expect(setBudgetCarryover).toHaveBeenCalledWith('2026-03', 'abc-123', true);
    });

    it('should work with carryover set to false', async () => {
      vi.mocked(setBudgetCarryover).mockResolvedValue(undefined);

      const result = await handler({ month: '2026-03', categoryId: 'abc-123', carryover: false });

      expect(result.isError).toBeUndefined();
      expect(setBudgetCarryover).toHaveBeenCalledWith('2026-03', 'abc-123', false);
    });
  });

  describe('handler - validation', () => {
    it('should return error when month is missing', async () => {
      const result = await handler({ categoryId: 'abc-123', carryover: true });

      expect(result.isError).toBe(true);
      expect(setBudgetCarryover).not.toHaveBeenCalled();
    });

    it('should return error when categoryId is missing', async () => {
      const result = await handler({ month: '2026-03', carryover: true });

      expect(result.isError).toBe(true);
      expect(setBudgetCarryover).not.toHaveBeenCalled();
    });

    it('should return error when carryover is missing', async () => {
      const result = await handler({ month: '2026-03', categoryId: 'abc-123' });

      expect(result.isError).toBe(true);
      expect(setBudgetCarryover).not.toHaveBeenCalled();
    });

    it('should return error for bad month format', async () => {
      const result = await handler({ month: 'March 2026', categoryId: 'abc-123', carryover: true });

      expect(result.isError).toBe(true);
      expect(setBudgetCarryover).not.toHaveBeenCalled();
    });

    it('should return error when carryover is not a boolean', async () => {
      const result = await handler({ month: '2026-03', categoryId: 'abc-123', carryover: 'yes' });

      expect(result.isError).toBe(true);
      expect(setBudgetCarryover).not.toHaveBeenCalled();
    });
  });

  describe('handler - error', () => {
    it('should return error when setBudgetCarryover throws', async () => {
      vi.mocked(setBudgetCarryover).mockRejectedValue(new Error('API error'));

      const result = await handler({ month: '2026-03', categoryId: 'abc-123', carryover: true });

      expect(result.isError).toBe(true);
    });
  });
});
