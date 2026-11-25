import { describe, it, expect } from 'vitest';
import { parseScheduleFields } from './schedule-input.js';

describe('parseScheduleFields', () => {
  it('accepts a monthly recurrence with an approximate amount', () => {
    const parsed = parseScheduleFields({
      name: ' Internet ',
      account: 'acc-1',
      payee: 'payee-1',
      amount: -4550,
      amountOp: 'isapprox',
      date: { frequency: 'monthly', interval: 1, start: '2026-12-03', endMode: 'never' },
      posts_transaction: false,
    });

    expect(parsed).toEqual({
      fields: {
        name: 'Internet',
        account: 'acc-1',
        payee: 'payee-1',
        amount: -4550,
        amountOp: 'isapprox',
        date: { frequency: 'monthly', interval: 1, start: '2026-12-03', endMode: 'never' },
        posts_transaction: false,
      },
    });
  });

  it('accepts a one-off date and an isbetween range', () => {
    const parsed = parseScheduleFields({
      date: '2026-12-22',
      amount: { num1: -45000, num2: -40000 },
      amountOp: 'isbetween',
    });

    expect(parsed).toEqual({
      fields: { date: '2026-12-22', amount: { num1: -45000, num2: -40000 }, amountOp: 'isbetween' },
    });
  });

  it('returns no fields when none are given', () => {
    expect(parseScheduleFields({ id: 'x' })).toEqual({ fields: {} });
  });

  it.each([
    [{ name: '' }, 'name'],
    [{ amount: -45.5 }, 'integer'],
    [{ amount: -4550, amountOp: 'isbetween' }, 'isbetween'],
    [{ amountOp: 'about' }, 'amountOp'],
    [{ date: '03-12-2026' }, 'YYYY-MM-DD'],
    [{ date: { frequency: 'fortnightly', start: '2026-12-03' } }, 'frequency'],
    [{ date: { frequency: 'monthly' } }, 'start'],
    [{ date: { frequency: 'monthly', start: '2026-12-03', endMode: 'sometime' } }, 'endMode'],
    [{ posts_transaction: 'yes' }, 'posts_transaction'],
    [{ payee: 5 }, 'payee'],
  ])('rejects %j', (args, message) => {
    const parsed = parseScheduleFields(args as Record<string, unknown>);
    expect('error' in parsed && parsed.error).toContain(message);
  });
});
