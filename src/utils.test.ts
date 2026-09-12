import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  getRecentMonths,
  formatMonthLabel,
  endOfMonth,
  formatAmount,
  formatDate,
  getDateRangeForMonths,
} from './utils.js';
import { MonthlySummaryTransactionAggregator } from './tools/monthly-summary/transaction-aggregator.js';
import { MonthlySummaryCalculator } from './tools/monthly-summary/summary-calculator.js';

afterEach(() => {
  vi.useRealTimers();
});

function freeze(iso: string): void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

describe('getRecentMonths', () => {
  it('returns N months oldest first, ending with the current month', () => {
    freeze('2026-08-15T12:00:00');

    expect(getRecentMonths(3)).toEqual(['2026-06', '2026-07', '2026-08']);
  });

  it('crosses the year boundary correctly', () => {
    freeze('2026-02-10T12:00:00');

    expect(getRecentMonths(4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('zero-pads single-digit months', () => {
    freeze('2026-10-01T12:00:00');

    expect(getRecentMonths(2)).toEqual(['2026-09', '2026-10']);
  });

  it('returns just the current month for 1, and nothing for 0', () => {
    freeze('2026-08-15T12:00:00');

    expect(getRecentMonths(1)).toEqual(['2026-08']);
    expect(getRecentMonths(0)).toEqual([]);
  });

  it('does not skip a month when today is the 31st', () => {
    // Reason: naive month arithmetic on a 31st rolls short months forward,
    // e.g. Jan 31 minus one month landing back on Mar 3.
    freeze('2026-08-31T12:00:00');

    expect(getRecentMonths(7)).toEqual(['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08']);
  });
});

describe('formatMonthLabel', () => {
  it('renders a short month and year', () => {
    expect(formatMonthLabel('2026-07')).toBe('Jul 2026');
    expect(formatMonthLabel('2026-01')).toBe('Jan 2026');
    expect(formatMonthLabel('2026-12')).toBe('Dec 2026');
  });

  it('returns the input unchanged when it is not a month key', () => {
    expect(formatMonthLabel('nonsense')).toBe('nonsense');
    expect(formatMonthLabel('')).toBe('');
  });
});

describe('endOfMonth', () => {
  it('returns the last calendar day of the month', () => {
    expect(endOfMonth('2026-01').getDate()).toBe(31);
    expect(endOfMonth('2026-04').getDate()).toBe(30);
    expect(endOfMonth('2026-12').getDate()).toBe(31);
  });

  it('handles February in common and leap years', () => {
    expect(endOfMonth('2026-02').getDate()).toBe(28);
    expect(endOfMonth('2028-02').getDate()).toBe(29);
  });

  it('keeps the month it was given', () => {
    const d = endOfMonth('2026-07');

    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
  });
});

describe('getDateRangeForMonths', () => {
  it('preserves calendar months through aggregation in the local timezone', () => {
    freeze('2026-09-12T12:00:00');
    const { start, end } = getDateRangeForMonths(3);
    const rows = new MonthlySummaryTransactionAggregator().aggregate(
      [{ id: 'salary', account: 'checking', date: '2026-09-30', amount: 9_000, category: 'salary' }],
      new Set(['salary']),
      start,
      end
    );

    expect(rows).toEqual([
      { year: 2026, month: 7, income: 0, expenses: 0, transactions: 0 },
      { year: 2026, month: 8, income: 0, expenses: 0, transactions: 0 },
      { year: 2026, month: 9, income: 9_000, expenses: 0, transactions: 1 },
    ]);
    expect({ start, end }).toEqual({ start: '2026-07-01', end: '2026-09-30' });
    expect(new MonthlySummaryCalculator().calculateAverages(rows).avgIncome).toBe(3_000);
  });

  it('spans from the first day N months back to the last day of this month', () => {
    freeze('2026-08-15T12:00:00');

    expect(getDateRangeForMonths(3)).toEqual({ start: '2026-06-01', end: '2026-08-31' });
  });
});

describe('formatDate', () => {
  it('preserves local calendar dates at midnight and late evening', () => {
    expect(formatDate(new Date(2026, 8, 1))).toBe('2026-09-01');
    expect(formatDate(new Date(2026, 8, 30, 23, 59))).toBe('2026-09-30');
  });

  it('still rejects invalid Date objects', () => {
    expect(() => formatDate(new Date(NaN))).toThrow(RangeError);
  });
});

describe('formatAmount', () => {
  it('converts integer cents to a currency string', () => {
    expect(formatAmount(123456)).toBe('$1,234.56');
    expect(formatAmount(0)).toBe('$0.00');
  });

  it('renders negatives and missing values distinctly', () => {
    expect(formatAmount(-500)).toBe('-$5.00');
    expect(formatAmount(null)).toBe('N/A');
    expect(formatAmount(undefined)).toBe('N/A');
  });
});
