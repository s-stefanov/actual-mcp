import { describe, it, expect } from 'vitest';
import { PayeeAggregator } from './payee-aggregator.js';
import type { Transaction } from '../../core/types/domain.js';

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    account: 'acct-1',
    date: '2026-07-01',
    amount: -1000,
    ...overrides,
  };
}

describe('PayeeAggregator', () => {
  it('totals spending per payee and ranks by amount', () => {
    const transactions = [
      transaction({ payee: 'p1', payee_name: 'Grocer', amount: -5000 }),
      transaction({ payee: 'p1', payee_name: 'Grocer', amount: -3000 }),
      transaction({ payee: 'p2', payee_name: 'Cafe', amount: -2000 }),
    ];

    const result = new PayeeAggregator().aggregate(transactions, false);

    expect(result.map((p) => p.name)).toEqual(['Grocer', 'Cafe']);
    expect(result[0]).toMatchObject({ total: 8000, transactions: 2, average: 4000 });
    expect(result[0].share).toBeCloseTo(80, 5);
    expect(result[1].share).toBeCloseTo(20, 5);
  });

  it('excludes transfers and respects the income/expense direction', () => {
    const transactions = [
      transaction({ payee: 'p1', payee_name: 'Grocer', amount: -5000 }),
      transaction({ payee: 'p2', payee_name: 'Employer', amount: 900000 }),
      transaction({ payee: 'p3', payee_name: 'Savings', amount: -100000, transfer_id: 'tx-99' }),
    ];

    const aggregator = new PayeeAggregator();

    const spending = aggregator.aggregate(transactions, false);
    expect(spending.map((p) => p.name)).toEqual(['Grocer']);

    const income = aggregator.aggregate(transactions, true);
    expect(income.map((p) => p.name)).toEqual(['Employer']);
    expect(income[0].total).toBe(900000);
  });

  it('falls back to a placeholder when a transaction has no payee', () => {
    const result = new PayeeAggregator().aggregate([transaction({ amount: -1500 })], false);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'unknown', name: 'Unknown payee', total: 1500 });
  });

  it('returns an empty list when nothing matches', () => {
    const result = new PayeeAggregator().aggregate([], false);

    expect(result).toEqual([]);
  });
});
