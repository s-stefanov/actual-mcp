import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler as getSchedulesHandler } from './get-schedules/index.js';
import { handler as createScheduleHandler } from './create-schedule/index.js';
import { handler as updateScheduleHandler } from './update-schedule/index.js';
import { handler as deleteScheduleHandler } from './delete-schedule/index.js';

vi.mock('../../actual-automation-api.js', () => ({
  getSchedules: vi.fn(),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  setScheduleCompleted: vi.fn(),
  deleteSchedule: vi.fn(),
}));
vi.mock('../../actual-api.js', () => ({
  getPayees: vi.fn(),
  getAccounts: vi.fn(),
}));

import {
  createSchedule,
  deleteSchedule,
  getSchedules,
  setScheduleCompleted,
  updateSchedule,
} from '../../actual-automation-api.js';
import { getAccounts, getPayees } from '../../actual-api.js';

const text = (result: { content: Array<{ type: string; text?: string }> }): string => result.content[0].text ?? '';

describe('schedule tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get-schedules', () => {
    beforeEach(() => {
      vi.mocked(getSchedules).mockResolvedValue([
        {
          id: 's1',
          name: 'Internet',
          payee: 'p1',
          account: 'a1',
          amount: -4550,
          amountOp: 'isapprox',
          date: '2026-12-03',
          completed: false,
          posts_transaction: false,
        },
        {
          id: 's2',
          name: 'Old gym',
          payee: 'p9',
          account: 'a1',
          amount: -10000,
          amountOp: 'is',
          date: '2025-01-01',
          completed: true,
          posts_transaction: false,
        },
      ]);
      vi.mocked(getPayees).mockResolvedValue([{ id: 'p1', name: 'Digi' }] as never);
      vi.mocked(getAccounts).mockResolvedValue([{ id: 'a1', name: 'Checking' }] as never);
    });

    it('lists active schedules with payee and account names', async () => {
      const result = await getSchedulesHandler({});
      const rows = JSON.parse(text(result));

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: 's1', payee_name: 'Digi', account_name: 'Checking' });
    });

    it('includes completed schedules on request, with unknown names as null', async () => {
      const rows = JSON.parse(text(await getSchedulesHandler({ includeCompleted: true })));

      expect(rows.map((r: { id: string }) => r.id)).toEqual(['s1', 's2']);
      expect(rows[1].payee_name).toBeNull();
    });

    it('returns an error when the API fails', async () => {
      vi.mocked(getSchedules).mockRejectedValue(new Error('budget not loaded'));

      expect((await getSchedulesHandler({})).isError).toBe(true);
    });
  });

  describe('create-schedule', () => {
    const args = {
      name: 'Internet',
      account: 'a1',
      payee: 'p1',
      amount: -4550,
      date: { frequency: 'monthly', start: '2026-12-03' },
    };

    it('creates the schedule with isapprox and no auto-posting by default', async () => {
      vi.mocked(createSchedule).mockResolvedValue('new-id');

      const result = await createScheduleHandler(args);

      expect(result.isError).toBeFalsy();
      expect(createSchedule).toHaveBeenCalledWith({ ...args, amountOp: 'isapprox', posts_transaction: false });
      expect(JSON.parse(text(result)).id).toBe('new-id');
    });

    it('requires every core field', async () => {
      const { payee: _payee, ...withoutPayee } = args;
      const result = await createScheduleHandler(withoutPayee);

      expect(result.isError).toBe(true);
      expect(text(result)).toContain('payee is required');
      expect(createSchedule).not.toHaveBeenCalled();
    });

    it('rejects a decimal amount', async () => {
      const result = await createScheduleHandler({ ...args, amount: -45.5 });

      expect(result.isError).toBe(true);
      expect(createSchedule).not.toHaveBeenCalled();
    });
  });

  describe('update-schedule', () => {
    it('updates fields without touching completion', async () => {
      await updateScheduleHandler({ id: 's1', amount: -5000, amountOp: 'is' });

      expect(updateSchedule).toHaveBeenCalledWith('s1', { amount: -5000, amountOp: 'is' }, false);
      expect(setScheduleCompleted).not.toHaveBeenCalled();
    });

    it('completes a schedule without a field update', async () => {
      const result = await updateScheduleHandler({ id: 's1', completed: true });

      expect(result.isError).toBeFalsy();
      expect(updateSchedule).not.toHaveBeenCalled();
      expect(setScheduleCompleted).toHaveBeenCalledWith('s1', true);
    });

    it('requires amount and amountOp together, so a range schedule cannot get a scalar amount', async () => {
      const result = await updateScheduleHandler({ id: 's1', amount: -5000 });

      expect(result.isError).toBe(true);
      expect(text(result)).toContain('together');
      expect(updateSchedule).not.toHaveBeenCalled();
    });

    it('rejects resetNextDate without a field change', async () => {
      const result = await updateScheduleHandler({ id: 's1', resetNextDate: true });

      expect(result.isError).toBe(true);
      expect(updateSchedule).not.toHaveBeenCalled();
    });

    it('rejects a call with nothing to change', async () => {
      const result = await updateScheduleHandler({ id: 's1' });

      expect(result.isError).toBe(true);
      expect(updateSchedule).not.toHaveBeenCalled();
    });

    it('surfaces API errors such as duplicate names', async () => {
      vi.mocked(updateSchedule).mockRejectedValue(new Error('There is already a schedule named: Internet'));

      const result = await updateScheduleHandler({ id: 's1', name: 'Internet' });

      expect(result.isError).toBe(true);
      expect(text(result)).toContain('already a schedule');
    });
  });

  describe('delete-schedule', () => {
    it('deletes by id', async () => {
      expect((await deleteScheduleHandler({ id: 's1' })).isError).toBeFalsy();
      expect(deleteSchedule).toHaveBeenCalledWith('s1');
    });

    it('requires an id', async () => {
      expect((await deleteScheduleHandler({})).isError).toBe(true);
      expect(deleteSchedule).not.toHaveBeenCalled();
    });
  });
});
