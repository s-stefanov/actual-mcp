import { describe, it, expect } from 'vitest';
import { MonthlySummaryTransactionAggregator } from './transaction-aggregator.js';
import type { Transaction } from '../../types.js';

describe('MonthlySummaryTransactionAggregator', () => {
  it('aggregates income and expenses while skipping transfers', () => {
    const aggregator = new MonthlySummaryTransactionAggregator();
    const transactions: Transaction[] = [
      {
        id: 'income-1',
        account: 'acc-1',
        date: '2024-01-05',
        amount: 2500,
        category: 'income-cat',
      },
      {
        id: 'expense-1',
        account: 'acc-1',
        date: '2024-01-07',
        amount: -300,
        category: 'groceries-cat',
      },
      {
        id: 'transfer-1',
        account: 'acc-1',
        date: '2024-01-10',
        amount: -500,
        transfer_id: 'linked-transfer-1',
      },
    ];
    const incomeCategories = new Set(['income-cat']);
    const investmentCategories = new Set<string>();

    const result = aggregator.aggregate(transactions, incomeCategories, investmentCategories);

    expect(result).toEqual([
      {
        year: 2024,
        month: 1,
        income: 2500,
        expenses: 300,
        investments: 0,
        transactions: 2,
      },
    ]);
  });

  it('tracks investment categories separately from expenses', () => {
    const aggregator = new MonthlySummaryTransactionAggregator();
    const transactions: Transaction[] = [
      {
        id: 'investment-1',
        account: 'acc-1',
        date: '2024-02-01',
        amount: -700,
        category: 'invest-cat',
      },
      {
        id: 'income-2',
        account: 'acc-1',
        date: '2024-02-15',
        amount: 500,
      },
    ];
    const incomeCategories = new Set<string>();
    const investmentCategories = new Set(['invest-cat']);

    const [monthData] = aggregator.aggregate(transactions, incomeCategories, investmentCategories);

    expect(monthData).toEqual({
      year: 2024,
      month: 2,
      income: 500,
      expenses: 0,
      investments: 700,
      transactions: 2,
    });
  });

  it('counts transfers with categories in the monthly totals', () => {
    const aggregator = new MonthlySummaryTransactionAggregator();
    const transactions: Transaction[] = [
      {
        id: 'income-1',
        account: 'acc-1',
        date: '2024-03-01',
        amount: 500,
      },
      {
        id: 'transfer-expense',
        account: 'acc-1',
        date: '2024-03-05',
        amount: -200,
        transfer_id: 'paired-transfer',
        category: 'groceries-cat',
      },
    ];

    const [monthData] = aggregator.aggregate(transactions, new Set<string>(), new Set<string>());

    expect(monthData).toEqual({
      year: 2024,
      month: 3,
      income: 500,
      expenses: 200,
      investments: 0,
      transactions: 2,
    });
  });
});
