import { describe, it, expect, afterEach, vi } from 'vitest';
import { getRecentMonths, formatMonthLabel, endOfMonth, formatAmount, getDateRangeForMonths } from './utils.js';

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
  it('spans from the first day N months back to the last day of this month', () => {
    freeze('2026-08-15T12:00:00');

    expect(getDateRangeForMonths(3)).toEqual({ start: '2026-06-01', end: '2026-08-31' });
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
