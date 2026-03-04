import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('@actual-app/api', () => ({
  getAccountBalance: vi.fn(),
}));

import { handler, schema } from './index.js';
import { getAccountBalance } from '@actual-app/api';

describe('get-account-balance tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name', () => {
      expect(schema.name).toBe('get-account-balance');
    });

    it('should require accountId', () => {
      expect(schema.inputSchema.required).toContain('accountId');
    });
  });

  describe('handler - happy path', () => {
    it('should call getAccountBalance and return balance with formatted amount', async () => {
      vi.mocked(getAccountBalance).mockResolvedValue(12030);

      const result = await handler({ accountId: 'abc-123' });

      expect(result.isError).toBeUndefined();
      expect(getAccountBalance).toHaveBeenCalledWith('abc-123');

      const text = (result.content[0] as { type: string; text: string }).text;
      const data = JSON.parse(text);
      expect(data.accountId).toBe('abc-123');
      expect(data.balance).toBe(12030);
      expect(data.balanceFormatted).toBe('$120.30');
    });
  });

  describe('handler - validation', () => {
    it('should return error when accountId is missing', async () => {
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(getAccountBalance).not.toHaveBeenCalled();
    });
  });

  describe('handler - error', () => {
    it('should return error when getAccountBalance throws', async () => {
      vi.mocked(getAccountBalance).mockRejectedValue(new Error('API error'));

      const result = await handler({ accountId: 'abc-123' });

      expect(result.isError).toBe(true);
    });
  });
});
