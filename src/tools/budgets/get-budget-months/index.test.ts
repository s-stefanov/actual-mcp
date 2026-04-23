import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  getBudgetMonths: vi.fn(),
}));

import { getBudgetMonths } from '../../../actual-api.js';

describe('get-budget-months tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('get-budget-months');
      expect(schema.description).toContain('budget months');
    });

    it('should have inputSchema defined', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('handler - happy path', () => {
    it('should return list of budget months', async () => {
      const months = ['2025-01', '2025-02', '2025-03'];
      vi.mocked(getBudgetMonths).mockResolvedValue(months);

      const result = await handler();

      expect(getBudgetMonths).toHaveBeenCalledOnce();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('2025-01');
    });

    it('should return empty array when no months exist', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue([]);

      const result = await handler();

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('[]');
    });
  });

  describe('handler - API errors', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(getBudgetMonths).mockRejectedValue(new Error('Connection failed'));

      const result = await handler();

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Connection failed');
    });
  });
});
