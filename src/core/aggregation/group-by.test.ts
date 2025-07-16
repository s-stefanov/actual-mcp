import { describe, it, expect } from 'vitest';
import { GroupAggregator } from './group-by.js';
import type { CategorySpending } from '../types/domain.js';

describe('GroupAggregator', () => {
  const aggregator = new GroupAggregator();

  it('should aggregate and sort spending by group', () => {
    const input: Record<string, CategorySpending> = {
      cat1: {
        id: '1',
        name: 'Food',
        group: 'Living',
        isIncome: false,
        total: -100,
        transactions: 5,
      },
      cat2: {
        id: '2',
        name: 'Rent',
        group: 'Living',
        isIncome: false,
        total: -800,
        transactions: 1,
      },
      cat3: {
        id: '3',
        name: 'Salary',
        group: 'Income',
        isIncome: true,
        total: 2000,
        transactions: 1,
      },
    };

    const result = aggregator.aggregateAndSort(input);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Income'); // Highest absolute value
    expect(result[0].total).toBe(2000);
    expect(result[0].categories).toHaveLength(1);
    expect(result[1].name).toBe('Living');
    expect(result[1].total).toBe(-900);
    expect(result[1].categories).toHaveLength(2);
  });

  it('should handle empty input', () => {
    const result = aggregator.aggregateAndSort({});
    expect(result).toEqual([]);
  });

  it('should sort categories within groups by absolute total', () => {
    const input: Record<string, CategorySpending> = {
      cat1: {
        id: '1',
        name: 'Food',
        group: 'Living',
        isIncome: false,
        total: -100,
        transactions: 5,
      },
      cat2: {
        id: '2',
        name: 'Rent',
        group: 'Living',
        isIncome: false,
        total: -800,
        transactions: 1,
      },
      cat3: {
        id: '3',
        name: 'Utilities',
        group: 'Living',
        isIncome: false,
        total: -200,
        transactions: 3,
      },
    };

    const result = aggregator.aggregateAndSort(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Living');
    expect(result[0].categories).toHaveLength(3);
    // Should be sorted by absolute total: Rent (-800), Utilities (-200), Food (-100)
    expect(result[0].categories[0].name).toBe('Rent');
    expect(result[0].categories[1].name).toBe('Utilities');
    expect(result[0].categories[2].name).toBe('Food');
  });

  it('should handle single category', () => {
    const input: Record<string, CategorySpending> = {
      cat1: {
        id: '1',
        name: 'Food',
        group: 'Living',
        isIncome: false,
        total: -100,
        transactions: 5,
      },
    };

    const result = aggregator.aggregateAndSort(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Living');
    expect(result[0].total).toBe(-100);
    expect(result[0].categories).toHaveLength(1);
    expect(result[0].categories[0].name).toBe('Food');
  });

  it('should handle positive and negative amounts correctly', () => {
    const input: Record<string, CategorySpending> = {
      cat1: {
        id: '1',
        name: 'Salary',
        group: 'Income',
        isIncome: true,
        total: 3000,
        transactions: 1,
      },
      cat2: {
        id: '2',
        name: 'Bonus',
        group: 'Income',
        isIncome: true,
        total: 1000,
        transactions: 1,
      },
      cat3: {
        id: '3',
        name: 'Food',
        group: 'Living',
        isIncome: false,
        total: -500,
        transactions: 10,
      },
    };

    const result = aggregator.aggregateAndSort(input);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Income'); // 4000 absolute value
    expect(result[0].total).toBe(4000);
    expect(result[1].name).toBe('Living'); // 500 absolute value
    expect(result[1].total).toBe(-500);
  });
});
