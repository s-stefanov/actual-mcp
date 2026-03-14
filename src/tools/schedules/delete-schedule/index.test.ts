import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  deleteSchedule: vi.fn(),
}));

import { handler, schema } from './index.js';
import { deleteSchedule } from '../../../actual-api.js';

describe('delete-schedule tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('delete-schedule');
      expect(schema.description).toContain('Delete');
    });

    it('should require id field', () => {
      expect(schema.inputSchema.required).toContain('id');
    });
  });

  describe('handler - happy path', () => {
    it('should delete a schedule successfully', async () => {
      vi.mocked(deleteSchedule).mockResolvedValue(undefined);

      const result = await handler({ id: 'sched-1' });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('sched-1');
      expect(deleteSchedule).toHaveBeenCalledWith('sched-1');
    });
  });

  describe('handler - validation', () => {
    it('should return error when id is missing', async () => {
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(deleteSchedule).not.toHaveBeenCalled();
    });

    it('should return error when id is not a string', async () => {
      const result = await handler({ id: 42 });

      expect(result.isError).toBe(true);
      expect(deleteSchedule).not.toHaveBeenCalled();
    });
  });

  describe('handler - error', () => {
    it('should return error when deleteSchedule throws', async () => {
      vi.mocked(deleteSchedule).mockRejectedValue(new Error('Schedule not found'));

      const result = await handler({ id: 'sched-bad' });

      expect(result.isError).toBe(true);
    });
  });
});
