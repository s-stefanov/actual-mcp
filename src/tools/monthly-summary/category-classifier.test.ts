import { describe, it, expect } from 'vitest';
import { MonthlySummaryCategoryClassifier } from './category-classifier.js';
import type { Category, CategoryGroup } from '../../core/types/domain.js';

describe('MonthlySummaryCategoryClassifier', () => {
  const classifier = new MonthlySummaryCategoryClassifier();

  it('uses Actual group income metadata despite category flags and Savings or Investment names', () => {
    const categories: Category[] = [
      { id: 'salary', name: 'Salary', group_id: 'income' },
      { id: 'savings', name: 'Savings', group_id: 'income', is_income: false },
      { id: 'investment', name: 'Investment', group_id: 'expense', is_income: true },
      { id: 'vacation', name: 'Vacation', group_id: 'expense' },
    ];
    const groups: CategoryGroup[] = [
      { id: 'income', name: 'Investment & Savings', is_income: true },
      { id: 'expense', name: 'Income', is_income: false },
    ];

    expect(classifier.classify(categories, groups)).toEqual(new Set(['salary', 'savings']));
  });

  it('returns no income categories for missing groups or missing income metadata', () => {
    expect(
      classifier.classify(
        [
          { id: 'missing', name: 'Income', group_id: 'missing', is_income: true },
          { id: 'unmarked', name: 'Salary', group_id: 'unmarked', is_income: true },
        ],
        [{ id: 'unmarked', name: 'Income' }]
      )
    ).toEqual(new Set());
  });

  it('handles an empty budget', () => {
    expect(classifier.classify([], [])).toEqual(new Set());
  });
});
