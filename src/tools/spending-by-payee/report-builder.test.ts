import { describe, it, expect } from 'vitest';
import { SpendingByPayeeReportBuilder } from './report-builder.js';
import type { PayeeSpending } from './types.js';

const payees: PayeeSpending[] = [
  { id: 'p1', name: 'Grocer', total: 8000, transactions: 2, average: 4000, share: 80 },
  { id: 'p2', name: 'Cafe', total: 2000, transactions: 1, average: 2000, share: 20 },
];

describe('SpendingByPayeeReportBuilder', () => {
  it('reports listed versus total payee counts separately', () => {
    const report = new SpendingByPayeeReportBuilder().build({
      start: '2026-06-01',
      end: '2026-08-25',
      includeIncome: false,
      payees: [payees[0]],
      totalListed: 135,
      grandTotal: 2431166,
    });

    // Reason: `payees` is truncated by `limit`, so the caller needs both counts
    // to know the list is partial.
    expect(report.listedCount).toBe(1);
    expect(report.totalPayeeCount).toBe(135);
    expect(report.grandTotal).toBe(2431166);
    expect(report.accountName).toBeNull();
    expect(report.excludesTransfers).toBe(true);
  });

  it('carries the account name and income flag through', () => {
    const report = new SpendingByPayeeReportBuilder().build({
      start: '2026-01-01',
      end: '2026-06-30',
      accountName: 'Checking',
      includeIncome: true,
      payees,
      totalListed: 2,
      grandTotal: 10000,
    });

    expect(report).toMatchObject({ accountName: 'Checking', includeIncome: true, listedCount: 2 });
  });

  it('handles a period with no matching payees', () => {
    const report = new SpendingByPayeeReportBuilder().build({
      start: '2026-01-01',
      end: '2026-01-31',
      includeIncome: false,
      payees: [],
      totalListed: 0,
      grandTotal: 0,
    });

    expect(report.payees).toEqual([]);
    expect(report.listedCount).toBe(0);
    expect(report.grandTotal).toBe(0);
  });
});
