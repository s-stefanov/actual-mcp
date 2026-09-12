import { describe, it, expect } from 'vitest';
import { CategoryTrendsAggregator } from './trend-aggregator.js';
import type { Category, CategoryGroup, Transaction } from '../../core/types/domain.js';

const MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08'];

const groups: CategoryGroup[] = [
  { id: 'g1', name: 'Food & Drink', is_income: false },
  { id: 'g2', name: 'Income', is_income: true },
];

const categories: Category[] = [
  { id: 'c1', name: 'Groceries', group_id: 'g1' },
  { id: 'c2', name: 'Eating Out', group_id: 'g1' },
  { id: 'c3', name: 'Salary', group_id: 'g2', is_income: true },
];

function transaction(category: string, date: string, amount: number): Transaction {
  return { id: `${category}-${date}`, account: 'a1', date, amount, category };
}

describe('CategoryTrendsAggregator', () => {
  it('builds a category-by-month matrix and detects a rising trend', () => {
    const transactions = [
      transaction('c1', '2026-05-04', -10000),
      transaction('c1', '2026-06-04', -10000),
      transaction('c1', '2026-07-04', -20000),
      transaction('c1', '2026-08-04', -20000),
    ];

    const [row] = new CategoryTrendsAggregator().aggregate(transactions, categories, groups, {
      months: MONTHS,
      includeIncome: false,
    });

    expect(row).toMatchObject({ name: 'Groceries', group: 'Food & Drink', total: 60000, average: 15000 });
    expect(row.amountsByMonth).toEqual({
      '2026-05': 10000,
      '2026-06': 10000,
      '2026-07': 20000,
      '2026-08': 20000,
    });
    expect(row.trend).toBe('rising');
    expect(row.changePercent).toBeCloseTo(100, 5);
  });

  it('calls a small swing flat rather than a trend', () => {
    const transactions = [
      transaction('c1', '2026-05-04', -10000),
      transaction('c1', '2026-06-04', -10000),
      transaction('c1', '2026-07-04', -10200),
      transaction('c1', '2026-08-04', -10200),
    ];

    const [row] = new CategoryTrendsAggregator().aggregate(transactions, categories, groups, {
      months: MONTHS,
      includeIncome: false,
    });

    expect(row.trend).toBe('flat');
  });

  it('excludes income categories unless asked, and ignores out-of-range dates', () => {
    const transactions = [
      transaction('c1', '2026-07-04', -10000),
      transaction('c3', '2026-07-01', 500000),
      transaction('c1', '2020-01-01', -99999),
    ];

    const aggregator = new CategoryTrendsAggregator();

    const expenses = aggregator.aggregate(transactions, categories, groups, {
      months: MONTHS,
      includeIncome: false,
    });
    expect(expenses.map((r) => r.name)).toEqual(['Groceries']);
    expect(expenses[0].total).toBe(10000);

    const withIncome = aggregator.aggregate(transactions, categories, groups, {
      months: MONTHS,
      includeIncome: true,
    });
    expect(withIncome.map((r) => r.name)).toEqual(['Salary', 'Groceries']);
  });

  it('filters by category name and by group name, case-insensitively', () => {
    const transactions = [transaction('c1', '2026-07-04', -10000), transaction('c2', '2026-07-05', -20000)];
    const aggregator = new CategoryTrendsAggregator();

    const byName = aggregator.aggregate(transactions, categories, groups, {
      months: MONTHS,
      includeIncome: false,
      categoryNames: ['groceries'],
    });
    expect(byName.map((r) => r.name)).toEqual(['Groceries']);

    const byGroup = aggregator.aggregate(transactions, categories, groups, {
      months: MONTHS,
      includeIncome: false,
      categoryGroupName: 'FOOD & DRINK',
    });
    expect(byGroup.map((r) => r.name)).toEqual(['Eating Out', 'Groceries']);
  });

  it('drops categories with no activity and returns nothing when no category matches', () => {
    const aggregator = new CategoryTrendsAggregator();

    expect(aggregator.aggregate([], categories, groups, { months: MONTHS, includeIncome: false })).toEqual([]);

    expect(
      aggregator.aggregate([transaction('c1', '2026-07-04', -100)], categories, groups, {
        months: MONTHS,
        includeIncome: false,
        categoryNames: ['Does Not Exist'],
      })
    ).toEqual([]);
  });
});
