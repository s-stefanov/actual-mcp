import { describe, it, expect } from 'vitest';
import { normalizeRuleStage } from './normalize-stage.js';

describe('normalizeRuleStage', () => {
  it('converts the string "null" to a real null', () => {
    expect(normalizeRuleStage({ stage: 'null' })).toEqual({ stage: null });
  });

  it('leaves a real null alone', () => {
    expect(normalizeRuleStage({ stage: null })).toEqual({ stage: null });
  });

  it('leaves "pre" alone', () => {
    expect(normalizeRuleStage({ stage: 'pre' })).toEqual({ stage: 'pre' });
  });

  it('leaves "post" alone', () => {
    expect(normalizeRuleStage({ stage: 'post' })).toEqual({ stage: 'post' });
  });

  it('leaves an absent stage absent', () => {
    expect(normalizeRuleStage({ conditionsOp: 'and' })).toEqual({ conditionsOp: 'and' });
  });

  it('keeps every other field untouched', () => {
    const actions = [{ field: 'notes', op: 'set', value: 'null' }];

    expect(normalizeRuleStage({ stage: 'null', conditionsOp: 'and', actions })).toEqual({
      stage: null,
      conditionsOp: 'and',
      actions,
    });
  });

  it('does not mutate the caller’s object', () => {
    const args = { stage: 'null' };

    normalizeRuleStage(args);

    expect(args.stage).toBe('null');
  });
});
