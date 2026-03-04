import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({
  createRule: vi.fn(),
}));

import { handler, schema } from './index.js';
import { createRule } from '../../actual-api.js';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const makeRule = (overrides: Record<string, unknown> = {}) => ({
  stage: null,
  conditionsOp: 'and' as const,
  conditions: [{ field: 'imported_payee' as const, op: 'contains' as const, value: 'MEIJER' }],
  actions: [{ field: 'category' as const, op: 'set' as const, value: 'cat-food' }],
  ...overrides,
});

describe('bulk-create-rules tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name', () => {
      expect(schema.name).toBe('bulk-create-rules');
    });

    it('should have inputSchema with type object', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('handler - happy path', () => {
    it('should create 2 rules and report all successful', async () => {
      vi.mocked(createRule)
        .mockResolvedValueOnce({ id: 'rule-1' } as never)
        .mockResolvedValueOnce({ id: 'rule-2' } as never);

      const args = { rules: [makeRule(), makeRule()] };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('2 created');
      expect(text).toContain('0 errors');
      expect(createRule).toHaveBeenCalledTimes(2);
    });

    it('should call createRule with the rule object', async () => {
      vi.mocked(createRule).mockResolvedValueOnce({ id: 'rule-1' } as never);

      const rule = makeRule({ conditionsOp: 'or' as const });
      const args = { rules: [rule] };

      await handler(args);

      expect(createRule).toHaveBeenCalledWith(rule);
    });
  });

  describe('handler - partial failure', () => {
    it('should report 2 successes and 1 error when middle rule throws', async () => {
      vi.mocked(createRule)
        .mockResolvedValueOnce({ id: 'rule-1' } as never)
        .mockRejectedValueOnce(new Error('Invalid condition'))
        .mockResolvedValueOnce({ id: 'rule-3' } as never);

      const args = { rules: [makeRule(), makeRule(), makeRule()] };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('2 created');
      expect(text).toContain('1 error');
      expect(text).toContain('Rule 1');
      expect(text).toContain('Invalid condition');
    });
  });

  describe('handler - all fail', () => {
    it('should report 0 created and 2 errors when all rules throw', async () => {
      vi.mocked(createRule).mockRejectedValueOnce(new Error('Bad rule')).mockRejectedValueOnce(new Error('Also bad'));

      const args = { rules: [makeRule(), makeRule()] };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('0 created');
      expect(text).toContain('2 errors');
      expect(text).toContain('Rule 0');
      expect(text).toContain('Rule 1');
    });
  });

  describe('handler - validation errors', () => {
    it('should return error for empty rules array', async () => {
      const args = { rules: [] };

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(createRule).not.toHaveBeenCalled();
    });

    it('should return error when rules is missing', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const args = {} as any;

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(createRule).not.toHaveBeenCalled();
    });
  });
});
