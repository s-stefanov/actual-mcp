import { describe, it, expect } from 'vitest';
import { CashFlowCalculator } from './cash-flow-calculator.js';
import type { Transaction } from '../../core/types/domain.js';

function transaction(date: string, amount: number, overrides: Partial<Transaction> = {}): Transaction {
  return { id: `${date}-${amount}`, account: 'a1', date, amount, ...overrides };
}

describe('CashFlowCalculator', () => {
  it('totals income and expenses per month with a running net', () => {
    const transactions = [
      transaction('2026-06-01', 500000),
      transaction('2026-06-15', -200000),
      transaction('2026-07-01', 500000),
      transaction('2026-07-15', -600000),
    ];

    const result = new CashFlowCalculator().calculate(transactions, 'monthly');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      key: '2026-06',
      income: 500000,
      expenses: 200000,
      net: 300000,
      runningNet: 300000,
    });
    expect(result[1]).toMatchObject({
      key: '2026-07',
      income: 500000,
      expenses: 600000,
      net: -100000,
      runningNet: 200000,
    });
    expect(result[0].label).toBe('Jun 2026');
  });

  it('buckets weekly on Monday boundaries', () => {
    // 2026-07-01 is a Wednesday; 2026-07-06 the following Monday.
    const transactions = [
      transaction('2026-07-01', -1000),
      transaction('2026-07-05', -2000),
      transaction('2026-07-06', -4000),
    ];

    const result = new CashFlowCalculator().calculate(transactions, 'weekly');

    expect(result.map((p) => [p.key, p.expenses])).toEqual([
      ['2026-06-29', 3000],
      ['2026-07-06', 4000],
    ]);
    expect(result[0].label).toBe('Week of 2026-06-29');
  });

  it('excludes transfers from both income and expenses', () => {
    const transactions = [
      transaction('2026-07-01', 500000),
      transaction('2026-07-02', -100000, { transfer_id: 'tx-1' }),
    ];

    const result = new CashFlowCalculator().calculate(transactions, 'monthly');

    expect(result[0]).toMatchObject({ income: 500000, expenses: 0, net: 500000, transactions: 1 });
  });

  it('returns no periods when there are no transactions', () => {
    expect(new CashFlowCalculator().calculate([], 'monthly')).toEqual([]);
  });
});
