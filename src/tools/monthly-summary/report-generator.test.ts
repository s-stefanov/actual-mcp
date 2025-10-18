import { describe, it, expect } from 'vitest';
import { MonthlySummaryReportGenerator } from './report-generator.js';
import type { MonthlySummaryReportData } from './types.js';

describe('MonthlySummaryReportGenerator', () => {
  it('renders traditional savings after subtracting investments', () => {
    const generator = new MonthlySummaryReportGenerator();
    const data: MonthlySummaryReportData = {
      start: '2024-01-01',
      end: '2024-01-31',
      accountId: 'acc-1',
      accountName: 'Checking',
      sortedMonths: [
        {
          year: 2024,
          month: 1,
          income: 400000,
          expenses: 200000,
          investments: 50000,
          transactions: 12,
        },
      ],
      avgIncome: 400000,
      avgExpenses: 200000,
      avgInvestments: 50000,
      avgTraditionalSavings: 150000,
      avgTotalSavings: 200000,
      avgTraditionalSavingsRate: 37.5,
      avgTotalSavingsRate: 50,
    };

    const markdown = generator.generate(data);

    expect(markdown).toContain('| January 2024 | $4,000.00 | $2,000.00 | $500.00 | $1,500.00 | $2,000.00 | 50.0% |');
    expect(markdown).toContain('Average Monthly Traditional Savings: $1,500.00');
    expect(markdown).toContain('Average Monthly Total Savings: $2,000.00');
    expect(markdown).toContain('Average Traditional Savings Rate: 37.5%');
    expect(markdown).toContain('**Traditional Savings**: Income minus regular expenses and investments');
  });

  it('uses N/A for savings rate when income is zero', () => {
    const generator = new MonthlySummaryReportGenerator();
    const data: MonthlySummaryReportData = {
      start: '2024-02-01',
      end: '2024-02-29',
      sortedMonths: [
        {
          year: 2024,
          month: 2,
          income: 0,
          expenses: 10000,
          investments: 0,
          transactions: 3,
        },
      ],
      avgIncome: 0,
      avgExpenses: 10000,
      avgInvestments: 0,
      avgTraditionalSavings: -10000,
      avgTotalSavings: -10000,
      avgTraditionalSavingsRate: 0,
      avgTotalSavingsRate: 0,
    };

    const markdown = generator.generate(data);

    expect(markdown).toContain('| February 2024 | $0.00 | $100.00 | $0.00 | -$100.00 | -$100.00 | N/A |');
    expect(markdown).toContain('Accounts: All on-budget accounts');
  });
});
