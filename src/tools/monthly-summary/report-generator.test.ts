import { describe, it, expect } from 'vitest';
import { MonthlySummaryReportGenerator } from './report-generator.js';
import type { MonthlySummaryReportData } from './types.js';

describe('MonthlySummaryReportGenerator', () => {
  it('renders net savings and averages including an empty month without an investments column', () => {
    const data: MonthlySummaryReportData = {
      start: '2026-01-01',
      end: '2026-02-28',
      accountId: 'acc-1',
      accountName: 'Checking',
      sortedMonths: [
        { year: 2026, month: 1, income: 10_000, expenses: 3_000, transactions: 3 },
        { year: 2026, month: 2, income: 0, expenses: 0, transactions: 0 },
      ],
      avgIncome: 5_000,
      avgExpenses: 1_500,
      avgSavings: 3_500,
      avgSavingsRate: 70,
    };

    const markdown = new MonthlySummaryReportGenerator().generate(data);

    expect(markdown).toContain('Account: Checking');
    expect(markdown).toContain('| Month | Income | Expenses | Savings | Savings Rate |');
    expect(markdown).toContain('| January 2026 | $100.00 | $30.00 | $70.00 | 70.0% |');
    expect(markdown).toContain('| February 2026 | $0.00 | $0.00 | $0.00 | 0.0% |');
    expect(markdown).toContain('Average Monthly Income: $50.00');
    expect(markdown).toContain('Average Monthly Expenses: $15.00');
    expect(markdown).toContain('Average Monthly Savings: $35.00');
    expect(markdown).toContain('Average Savings Rate: 70.0%');
    expect(markdown).not.toMatch(/investments|traditional savings|total savings/i);
  });

  it('renders a deficit with zero savings rate when income is zero', () => {
    const data: MonthlySummaryReportData = {
      start: '2026-02-01',
      end: '2026-02-28',
      sortedMonths: [{ year: 2026, month: 2, income: 0, expenses: 10_000, transactions: 3 }],
      avgIncome: 0,
      avgExpenses: 10_000,
      avgSavings: -10_000,
      avgSavingsRate: 0,
    };

    const markdown = new MonthlySummaryReportGenerator().generate(data);

    expect(markdown).toContain('| February 2026 | $0.00 | $100.00 | -$100.00 | 0.0% |');
    expect(markdown).toContain('Accounts: All on-budget accounts');
  });
});
