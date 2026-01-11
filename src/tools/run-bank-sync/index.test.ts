import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';

vi.mock('../../actual-api.js', () => ({
  runBankSync: vi.fn(),
}));

import { runBankSync } from '../../actual-api.js';

describe('run-bank-sync tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('run-bank-sync');
      expect(schema.description).toContain('bank synchronization');
    });

    it('should have inputSchema defined', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('handler - happy path', () => {
    it('should sync specific account when accountId provided', async () => {
      vi.mocked(runBankSync).mockResolvedValue(undefined);

      const result = await handler({ accountId: 'acc-123' });

      expect(runBankSync).toHaveBeenCalledWith('acc-123');
      expect(result.content[0]).toHaveProperty('text');
      expect((result.content[0] as { text: string }).text).toContain('acc-123');
    });

    it('should sync all accounts when no accountId provided', async () => {
      vi.mocked(runBankSync).mockResolvedValue(undefined);

      const result = await handler({});

      expect(runBankSync).toHaveBeenCalledWith(undefined);
      expect(result.content[0]).toHaveProperty('text');
      expect((result.content[0] as { text: string }).text).toContain('all linked accounts');
    });

    it('should sync onbudget accounts with special value', async () => {
      vi.mocked(runBankSync).mockResolvedValue(undefined);

      const result = await handler({ accountId: 'onbudget' });

      expect(runBankSync).toHaveBeenCalledWith('onbudget');
      expect((result.content[0] as { text: string }).text).toContain('on-budget');
    });

    it('should sync offbudget accounts with special value', async () => {
      vi.mocked(runBankSync).mockResolvedValue(undefined);

      const result = await handler({ accountId: 'offbudget' });

      expect(runBankSync).toHaveBeenCalledWith('offbudget');
      expect((result.content[0] as { text: string }).text).toContain('off-budget');
    });
  });

  describe('handler - validation errors', () => {
    it('should return error when accountId is not a string', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handler({ accountId: 123 } as any);

      expect(result.isError).toBe(true);
      expect(runBankSync).not.toHaveBeenCalled();
    });
  });

  describe('handler - API errors', () => {
    it('should handle sync errors', async () => {
      vi.mocked(runBankSync).mockRejectedValue(new Error('Bank sync failed'));

      const result = await handler({ accountId: 'acc-123' });

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('Bank sync failed');
    });

    it('should handle network errors', async () => {
      vi.mocked(runBankSync).mockRejectedValue(new Error('Network error'));

      const result = await handler({});

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('Network error');
    });
  });
});
