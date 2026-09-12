import { describe, it, expect } from 'vitest';
import { MonthlySummaryTransactionAggregator } from './transaction-aggregator.js';
import type { Transaction } from '../../types.js';

function transaction(date: string, amount: number, category?: string): Transaction {
  return { id: `${date}-${amount}`, account: 'acc-1', date, amount, category };
}

describe('MonthlySummaryTransactionAggregator', () => {
  const aggregator = new MonthlySummaryTransactionAggregator();

  it('subtracts refunds from expenses and includes empty requested months', () => {
    expect(
      aggregator.aggregate(
        [
          transaction('2026-01-05', 10_000, 'salary'),
          transaction('2026-01-10', -5_000, 'groceries'),
          transaction('2026-01-15', 2_000, 'groceries'),
        ],
        new Set(['salary']),
        '2026-01-01',
        '2026-02-28'
      )
    ).toEqual([
      { year: 2026, month: 1, income: 10_000, expenses: 3_000, transactions: 3 },
      { year: 2026, month: 2, income: 0, expenses: 0, transactions: 0 },
    ]);
  });

  it('does not classify uncategorized inflows as income and preserves income reversals', () => {
    expect(
      aggregator.aggregate(
        [transaction('2026-01-05', 500), transaction('2026-01-10', -200, 'salary')],
        new Set(['salary']),
        '2026-01-01',
        '2026-01-31'
      )
    ).toEqual([{ year: 2026, month: 1, income: -200, expenses: -500, transactions: 2 }]);
  });

  it('skips both uncategorized transfer legs but counts categorized transfers', () => {
    expect(
      aggregator.aggregate(
        [
          { ...transaction('2026-01-05', -500), transfer_id: 'other-leg' },
          { ...transaction('2026-01-05', 500), transfer_id: 'first-leg' },
          { ...transaction('2026-01-06', -200, 'groceries'), transfer_id: 'categorized-leg' },
        ],
        new Set(),
        '2026-01-01',
        '2026-01-31'
      )
    ).toEqual([{ year: 2026, month: 1, income: 0, expenses: 200, transactions: 1 }]);
  });

  it('seeds an empty range across the year boundary', () => {
    expect(aggregator.aggregate([], new Set(), '2025-12-15', '2026-02-10')).toEqual([
      { year: 2025, month: 12, income: 0, expenses: 0, transactions: 0 },
      { year: 2026, month: 1, income: 0, expenses: 0, transactions: 0 },
      { year: 2026, month: 2, income: 0, expenses: 0, transactions: 0 },
    ]);
  });
});
