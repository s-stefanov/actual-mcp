import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  setBudgetCarryover: vi.fn(),
}));

import { setBudgetCarryover } from '../../../actual-api.js';

describe('set-budget-carryover tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('set-budget-carryover');
      expect(schema.description).toContain('carryover');
    });

    it('should have inputSchema defined', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('handler - happy path', () => {
    it('should enable carryover and return success message', async () => {
      vi.mocked(setBudgetCarryover).mockResolvedValue(undefined);

      const result = await handler({ month: '2025-01', categoryId: 'cat-123', flag: true });

      expect(setBudgetCarryover).toHaveBeenCalledWith('2025-01', 'cat-123', true);
      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('enabled');
    });

    it('should disable carryover and indicate so in the message', async () => {
      vi.mocked(setBudgetCarryover).mockResolvedValue(undefined);

      const result = await handler({ month: '2025-02', categoryId: 'cat-456', flag: false });

      expect(setBudgetCarryover).toHaveBeenCalledWith('2025-02', 'cat-456', false);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('disabled');
    });
  });

  describe('handler - validation errors', () => {
    it('should return error when flag is missing', async () => {
      const result = await handler({ month: '2025-01', categoryId: 'cat-123' });

      expect(result.isError).toBe(true);
      expect(setBudgetCarryover).not.toHaveBeenCalled();
    });

    it('should return error when flag is not a boolean', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handler({ month: '2025-01', categoryId: 'cat-123', flag: 'yes' } as any);

      expect(result.isError).toBe(true);
      expect(setBudgetCarryover).not.toHaveBeenCalled();
    });
  });

  describe('handler - API errors', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(setBudgetCarryover).mockRejectedValue(new Error('Database error'));

      const result = await handler({ month: '2025-01', categoryId: 'cat-123', flag: true });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Database error');
    });
  });
});
