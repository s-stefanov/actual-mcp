import { describe, it, expect } from 'vitest';
import { BudgetVsActualAggregator } from './budget-aggregator.js';
import type { BudgetMonth } from '../../types.js';

function budgetMonth(overrides: Partial<BudgetMonth> = {}): BudgetMonth {
  return {
    month: '2026-07',
    incomeAvailable: 0,
    lastMonthOverspent: 0,
    forNextMonth: 0,
    totalBudgeted: -100000,
    toBudget: 25000,
    fromLastMonth: 0,
    totalIncome: 500000,
    totalSpent: -80000,
    totalBalance: 20000,
    categoryGroups: [
      {
        id: 'group-1',
        name: 'Food & Drink',
        is_income: false,
        hidden: false,
        budgeted: 60000,
        spent: -45000,
        balance: 15000,
        categories: [
          {
            id: 'cat-1',
            name: 'Groceries',
            group_id: 'group-1',
            hidden: false,
            budgeted: 40000,
            spent: -30000,
            balance: 10000,
            carryover: false,
          },
          {
            id: 'cat-2',
            name: 'Eating Out',
            group_id: 'group-1',
            hidden: false,
            budgeted: 20000,
            spent: -15000,
            balance: 5000,
            carryover: true,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('BudgetVsActualAggregator', () => {
  it('normalizes negative spend into positive magnitudes and keeps balances signed', () => {
    const result = new BudgetVsActualAggregator().aggregate([budgetMonth()], { includeHidden: false });

    expect(result).toHaveLength(1);
    expect(result[0].month).toBe('2026-07');
    expect(result[0].toBudget).toBe(25000);

    const group = result[0].groups[0];
    expect(group.name).toBe('Food & Drink');
    expect(group.spent).toBe(45000);
    expect(group.balance).toBe(15000);

    expect(group.categories.map((c) => [c.name, c.spent, c.balance, c.carryover])).toEqual([
      ['Groceries', 30000, 10000, false],
      ['Eating Out', 15000, 5000, true],
    ]);
  });

  it('excludes income groups, and hidden rows unless asked for them', () => {
    const month = budgetMonth({
      categoryGroups: [
        {
          id: 'income',
          name: 'Income',
          is_income: true,
          budgeted: 0,
          spent: 0,
          balance: 0,
          categories: [],
        },
        {
          id: 'group-2',
          name: 'Archived',
          is_income: false,
          hidden: true,
          budgeted: 0,
          spent: -100,
          balance: -100,
          categories: [],
        },
        {
          id: 'group-3',
          name: 'Housing',
          is_income: false,
          hidden: false,
          budgeted: 100000,
          spent: -100000,
          balance: 0,
          categories: [
            { id: 'cat-3', name: 'Mortgage', group_id: 'group-3', hidden: false, budgeted: 100000, spent: -100000 },
            { id: 'cat-4', name: 'Old HOA', group_id: 'group-3', hidden: true, budgeted: 0, spent: 0 },
          ],
        },
      ],
    });

    const aggregator = new BudgetVsActualAggregator();

    const visible = aggregator.aggregate([month], { includeHidden: false });
    expect(visible[0].groups.map((g) => g.name)).toEqual(['Housing']);
    expect(visible[0].groups[0].categories.map((c) => c.name)).toEqual(['Mortgage']);

    const all = aggregator.aggregate([month], { includeHidden: true });
    expect(all[0].groups.map((g) => g.name)).toEqual(['Archived', 'Housing']);
    expect(all[0].groups[1].categories.map((c) => c.name)).toEqual(['Mortgage', 'Old HOA']);
  });

  it('filters to a named category group, case-insensitively', () => {
    const result = new BudgetVsActualAggregator().aggregate([budgetMonth()], {
      includeHidden: false,
      categoryGroupName: 'food & drink',
    });

    expect(result[0].groups.map((g) => g.name)).toEqual(['Food & Drink']);

    const noMatch = new BudgetVsActualAggregator().aggregate([budgetMonth()], {
      includeHidden: false,
      categoryGroupName: 'Nonexistent',
    });

    expect(noMatch[0].groups).toEqual([]);
  });

  it('tolerates a month with missing figures and no category groups', () => {
    const bare = budgetMonth({ categoryGroups: [{ id: 'g', name: 'Sparse', is_income: false }] });

    const result = new BudgetVsActualAggregator().aggregate([bare], { includeHidden: false });

    expect(result[0].groups[0]).toMatchObject({ budgeted: 0, spent: 0, balance: 0, categories: [] });
  });
});
