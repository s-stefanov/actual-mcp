import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  createRule: vi.fn(),
}));

import { createRule } from '../../../actual-api.js';

const baseRule = {
  conditionsOp: 'and',
  conditions: [{ field: 'payee', op: 'is', value: 'payee-1' }],
  actions: [{ field: 'category', op: 'set', value: 'cat-1' }],
};

describe('create-rule tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createRule).mockResolvedValue({ id: 'rule-1' } as never);
  });

  describe('schema', () => {
    it('should have correct name', () => {
      expect(schema.name).toBe('create-rule');
    });
  });

  describe('handler - stage handling', () => {
    it('should pass a real null stage through untouched', async () => {
      await handler({ ...baseRule, stage: null });

      expect(createRule).toHaveBeenCalledWith(expect.objectContaining({ stage: null }));
    });

    it('should convert a stringified "null" stage into a real null', async () => {
      const result = await handler({ ...baseRule, stage: 'null' });

      expect(createRule).toHaveBeenCalledWith(expect.objectContaining({ stage: null }));
      expect(result.isError).toBeFalsy();
    });

    it('should leave a "pre" stage alone', async () => {
      await handler({ ...baseRule, stage: 'pre' });

      expect(createRule).toHaveBeenCalledWith(expect.objectContaining({ stage: 'pre' }));
    });

    it('should leave a "post" stage alone', async () => {
      await handler({ ...baseRule, stage: 'post' });

      expect(createRule).toHaveBeenCalledWith(expect.objectContaining({ stage: 'post' }));
    });

    it('should not rewrite a "null" string stored in an action value', async () => {
      const actions = [{ field: 'notes', op: 'set', value: 'null' }];

      await handler({ ...baseRule, actions, stage: 'null' });

      expect(createRule).toHaveBeenCalledWith(expect.objectContaining({ actions }));
    });
  });

  describe('handler - API errors', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(createRule).mockRejectedValue(new Error('Invalid rule stage: bogus'));

      const result = await handler({ ...baseRule, stage: 'bogus' });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Invalid rule stage');
    });
  });
});
