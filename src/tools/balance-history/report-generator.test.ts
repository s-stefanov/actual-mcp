import { describe, expect, it } from 'vitest';
import type { Account } from '../../types.js';
import { BalanceHistoryReportGenerator } from './report-generator.js';

describe('BalanceHistoryReportGenerator', () => {
  it('marks only the partial current month in the report', () => {
    const account: Account = { id: 'a1', name: 'Checking' };
    const markdown = new BalanceHistoryReportGenerator().generate(account, { start: '2026-08-01', end: '2026-09-12' }, [
      { year: 2026, month: 9, balance: 10_000, transactions: 1, change: -2_000, isPartial: true },
      { year: 2026, month: 8, balance: 12_000, transactions: 0, isPartial: false },
    ]);

    expect(markdown).toContain('| September 2026 (partial) | $100.00 | ↓ -$20.00 | 1 |');
    expect(markdown).toContain('| August 2026 | $120.00 |  N/A | 0 |');
    expect(markdown).not.toContain('August 2026 (partial)');
  });
});
