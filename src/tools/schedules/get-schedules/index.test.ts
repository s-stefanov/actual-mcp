import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  getSchedules: vi.fn(),
}));

import { handler, schema } from './index.js';
import { getSchedules } from '../../../actual-api.js';

describe('get-schedules tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('get-schedules');
      expect(schema.description).toContain('schedules');
    });

    it('should have inputSchema defined', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('handler - happy path', () => {
    it('should return all schedules with structured fields', async () => {
      vi.mocked(getSchedules).mockResolvedValue([
        {
          id: 'sched-1',
          name: 'Rent',
          posts_transaction: true,
          next_date: '2026-04-01',
          completed: false,
          payee: 'payee-abc',
          account: 'acct-xyz',
          amount: -150000,
          amountOp: 'is',
          date: '2026-04-01',
        },
        {
          id: 'sched-2',
          name: 'Netflix',
          posts_transaction: false,
          next_date: '2026-03-15',
          completed: false,
          payee: 'payee-def',
          account: 'acct-xyz',
          amount: -1799,
          amountOp: 'isapprox',
          date: { frequency: 'monthly', start: '2026-03-15' },
        },
      ]);

      const result = await handler();

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      const data = JSON.parse(text);
      expect(data).toHaveLength(2);
      expect(data[0]).toMatchObject({
        id: 'sched-1',
        name: 'Rent',
        posts_transaction: true,
        next_date: '2026-04-01',
        completed: false,
        payee: 'payee-abc',
        account: 'acct-xyz',
        amount: -150000,
        amountOp: 'is',
      });
    });
  });

  describe('handler - empty list', () => {
    it('should return empty array when no schedules exist', async () => {
      vi.mocked(getSchedules).mockResolvedValue([]);

      const result = await handler();

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      const data = JSON.parse(text);
      expect(data).toEqual([]);
    });
  });

  describe('handler - error', () => {
    it('should return error when getSchedules throws', async () => {
      vi.mocked(getSchedules).mockRejectedValue(new Error('API connection failed'));

      const result = await handler();

      expect(result.isError).toBe(true);
    });
  });
});
