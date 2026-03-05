import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  updateSchedule: vi.fn(),
}));

import { handler, schema } from './index.js';
import { updateSchedule } from '../../../actual-api.js';

describe('update-schedule tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('update-schedule');
      expect(schema.description).toContain('Update');
    });

    it('should require id field', () => {
      expect(schema.inputSchema.required).toContain('id');
    });
  });

  describe('handler - happy path', () => {
    it('should update a schedule with all fields', async () => {
      vi.mocked(updateSchedule).mockResolvedValue('sched-1');

      const result = await handler({
        id: 'sched-1',
        name: 'Updated Rent',
        posts_transaction: true,
        next_date: '2026-05-01',
        completed: false,
        payee: 'payee-abc',
        account: 'acct-xyz',
        amount: -160000,
        amountOp: 'is',
        date: '2026-05-01',
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('sched-1');
      expect(updateSchedule).toHaveBeenCalledWith(
        'sched-1',
        {
          name: 'Updated Rent',
          posts_transaction: true,
          next_date: '2026-05-01',
          completed: false,
          payee: 'payee-abc',
          account: 'acct-xyz',
          amount: -160000,
          amountOp: 'is',
          date: '2026-05-01',
        },
        undefined
      );
    });

    it('should update a single field', async () => {
      vi.mocked(updateSchedule).mockResolvedValue('sched-2');

      await handler({ id: 'sched-2', name: 'Renamed' });

      expect(updateSchedule).toHaveBeenCalledWith('sched-2', { name: 'Renamed' }, undefined);
    });

    it('should pass resetNextDate flag as third argument', async () => {
      vi.mocked(updateSchedule).mockResolvedValue('sched-3');

      await handler({ id: 'sched-3', next_date: '2026-06-01', resetNextDate: true });

      expect(updateSchedule).toHaveBeenCalledWith('sched-3', { next_date: '2026-06-01' }, true);
    });
  });

  describe('handler - validation', () => {
    it('should return error when id is missing', async () => {
      const result = await handler({ name: 'test' });

      expect(result.isError).toBe(true);
      expect(updateSchedule).not.toHaveBeenCalled();
    });

    it('should return error when id is not a string', async () => {
      const result = await handler({ id: 42, name: 'test' });

      expect(result.isError).toBe(true);
      expect(updateSchedule).not.toHaveBeenCalled();
    });

    it('should return error when no update fields provided', async () => {
      const result = await handler({ id: 'sched-1' });

      expect(result.isError).toBe(true);
      expect(updateSchedule).not.toHaveBeenCalled();
    });
  });

  describe('handler - error', () => {
    it('should return error when updateSchedule throws', async () => {
      vi.mocked(updateSchedule).mockRejectedValue(new Error('Schedule not found'));

      const result = await handler({ id: 'sched-bad', name: 'test' });

      expect(result.isError).toBe(true);
    });
  });
});
