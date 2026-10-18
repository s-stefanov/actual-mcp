import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  updateRule: vi.fn(),
}));

import { updateRule } from '../../../actual-api.js';

const baseRule = {
  id: 'rule-1',
  conditionsOp: 'and',
  conditions: [{ field: 'payee', op: 'is', value: 'payee-1' }],
  actions: [{ field: 'category', op: 'set', value: 'cat-1' }],
};

describe('update-rule tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateRule).mockResolvedValue({ id: 'rule-1' } as never);
  });

  describe('schema', () => {
    it('should have correct name', () => {
      expect(schema.name).toBe('update-rule');
    });
  });

  describe('handler - stage handling', () => {
    it('should convert a stringified "null" stage into a real null', async () => {
      const result = await handler({ ...baseRule, stage: 'null' });

      expect(updateRule).toHaveBeenCalledWith(expect.objectContaining({ stage: null }));
      expect(result.isError).toBeFalsy();
    });

    it('should leave a "pre" stage alone', async () => {
      await handler({ ...baseRule, stage: 'pre' });

      expect(updateRule).toHaveBeenCalledWith(expect.objectContaining({ stage: 'pre' }));
    });

    it('should not add a stage when the caller omitted one', async () => {
      await handler({ ...baseRule });

      expect(updateRule).toHaveBeenCalledWith(expect.not.objectContaining({ stage: expect.anything() }));
    });
  });

  describe('handler - validation errors', () => {
    it('should return error when id is missing', async () => {
      const result = await handler({ conditionsOp: 'and', stage: 'null' });

      expect(result.isError).toBe(true);
      expect(updateRule).not.toHaveBeenCalled();
    });
  });
});
