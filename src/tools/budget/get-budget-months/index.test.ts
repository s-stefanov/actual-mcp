import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  getBudgetMonths: vi.fn(),
}));

import { handler, schema } from './index.js';
import { getBudgetMonths } from '../../../actual-api.js';

describe('get-budget-months tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name', () => {
      expect(schema.name).toBe('get-budget-months');
    });
  });

  describe('handler - happy path', () => {
    it('should return list of budget months', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue(['2026-01', '2026-02', '2026-03']);

      const result = await handler();

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('2026-01');
      expect(text).toContain('2026-03');
    });

    it('should return empty list when no budget months exist', async () => {
      vi.mocked(getBudgetMonths).mockResolvedValue([]);

      const result = await handler();

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(JSON.parse(text)).toEqual([]);
    });
  });

  describe('handler - error', () => {
    it('should return error when getBudgetMonths throws', async () => {
      vi.mocked(getBudgetMonths).mockRejectedValue(new Error('API error'));

      const result = await handler();

      expect(result.isError).toBe(true);
    });
  });
});
