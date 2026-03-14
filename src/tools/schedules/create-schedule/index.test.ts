import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  createSchedule: vi.fn(),
}));

import { handler, schema } from './index.js';
import { createSchedule } from '../../../actual-api.js';

describe('create-schedule tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('create-schedule');
      expect(schema.description).toContain('Create');
    });

    it('should require amountOp and date fields', () => {
      expect(schema.inputSchema.required).toContain('amountOp');
      expect(schema.inputSchema.required).toContain('date');
    });
  });

  describe('handler - happy path', () => {
    it('should create a schedule with all fields', async () => {
      vi.mocked(createSchedule).mockResolvedValue('sched-new-123');

      const result = await handler({
        name: 'Rent',
        posts_transaction: true,
        next_date: '2026-04-01',
        payee: 'payee-abc',
        account: 'acct-xyz',
        amount: -150000,
        amountOp: 'is',
        date: '2026-04-01',
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('sched-new-123');
      expect(createSchedule).toHaveBeenCalledWith({
        name: 'Rent',
        posts_transaction: true,
        next_date: '2026-04-01',
        payee: 'payee-abc',
        account: 'acct-xyz',
        amount: -150000,
        amountOp: 'is',
        date: '2026-04-01',
      });
    });

    it('should create a schedule with only required fields', async () => {
      vi.mocked(createSchedule).mockResolvedValue('sched-456');

      const result = await handler({ amountOp: 'isapprox', date: '2026-03-15' });

      expect(result.isError).toBeUndefined();
      expect(createSchedule).toHaveBeenCalledWith({ amountOp: 'isapprox', date: '2026-03-15' });
    });
  });

  describe('handler - validation', () => {
    it('should return error when amountOp is missing', async () => {
      const result = await handler({ date: '2026-03-15' });

      expect(result.isError).toBe(true);
      expect(createSchedule).not.toHaveBeenCalled();
    });

    it('should return error when date is missing', async () => {
      const result = await handler({ amountOp: 'is' });

      expect(result.isError).toBe(true);
      expect(createSchedule).not.toHaveBeenCalled();
    });
  });

  describe('handler - error', () => {
    it('should return error when createSchedule throws', async () => {
      vi.mocked(createSchedule).mockRejectedValue(new Error('Database error'));

      const result = await handler({ amountOp: 'is', date: '2026-03-15' });

      expect(result.isError).toBe(true);
    });
  });
});
