import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  resetBudgetHold: vi.fn(),
}));

import { resetBudgetHold } from '../../../actual-api.js';

describe('reset-budget-hold tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('reset-budget-hold');
      expect(schema.description).toContain('held budget');
    });

    it('should have inputSchema defined', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('handler - happy path', () => {
    it('should reset budget hold and return success message', async () => {
      vi.mocked(resetBudgetHold).mockResolvedValue(undefined);

      const result = await handler({ month: '2025-01' });

      expect(resetBudgetHold).toHaveBeenCalledWith('2025-01');
      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('2025-01');
    });
  });

  describe('handler - validation errors', () => {
    it('should return error when month is missing', async () => {
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(resetBudgetHold).not.toHaveBeenCalled();
    });

    it('should return error when month is not a string', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handler({ month: 202501 } as any);

      expect(result.isError).toBe(true);
      expect(resetBudgetHold).not.toHaveBeenCalled();
    });
  });

  describe('handler - API errors', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(resetBudgetHold).mockRejectedValue(new Error('Reset failed'));

      const result = await handler({ month: '2025-01' });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Reset failed');
    });
  });
});
