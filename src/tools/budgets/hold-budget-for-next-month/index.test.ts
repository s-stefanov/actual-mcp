import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  holdBudgetForNextMonth: vi.fn(),
}));

import { holdBudgetForNextMonth } from '../../../actual-api.js';

describe('hold-budget-for-next-month tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('hold-budget-for-next-month');
      expect(schema.description).toContain('budget funds');
    });

    it('should have inputSchema defined', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('handler - happy path', () => {
    it('should hold budget and return success message', async () => {
      vi.mocked(holdBudgetForNextMonth).mockResolvedValue(true);

      const result = await handler({ month: '2025-01', value: 10000 });

      expect(holdBudgetForNextMonth).toHaveBeenCalledWith('2025-01', 10000);
      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('10000');
    });

    it('should handle holding zero cents (no-op hold)', async () => {
      vi.mocked(holdBudgetForNextMonth).mockResolvedValue(true);

      const result = await handler({ month: '2025-03', value: 0 });

      expect(holdBudgetForNextMonth).toHaveBeenCalledWith('2025-03', 0);
      expect(result.isError).toBeFalsy();
    });
  });

  describe('handler - validation errors', () => {
    it('should return error when value is missing', async () => {
      const result = await handler({ month: '2025-01' });

      expect(result.isError).toBe(true);
      expect(holdBudgetForNextMonth).not.toHaveBeenCalled();
    });

    it('should return error when value is a decimal', async () => {
      const result = await handler({ month: '2025-01', value: 99.99 });

      expect(result.isError).toBe(true);
      expect(holdBudgetForNextMonth).not.toHaveBeenCalled();
    });
  });

  describe('handler - API errors', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(holdBudgetForNextMonth).mockRejectedValue(new Error('Insufficient funds'));

      const result = await handler({ month: '2025-01', value: 99999999 });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Insufficient funds');
    });
  });
});
