/**
 * Get date range parameters with defaults
 */
export function getDateRange(startDate?: string, endDate?: string): { startDate: string; endDate: string } {
  const today = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setMonth(today.getMonth() - 3); // 3 months ago by default

  return {
    startDate: startDate || formatDate(defaultStartDate),
    endDate: endDate || formatDate(today),
  };
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return '';
  if (typeof date === 'string') return date;

  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Format currency amounts for display
 */
export function formatAmount(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return 'N/A';

  // Convert from cents to dollars
  const dollars = amount / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

// Helper to calculate start/end date strings for the N most recent months
export function getDateRangeForMonths(months: number): {
  start: string;
  end: string;
} {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of current month
  const start = new Date(end.getFullYear(), end.getMonth() - months + 1, 1); // first day of N months ago
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

/**
 * List the N most recent months as `YYYY-MM` strings, oldest first,
 * ending with the current month.
 */
export function getRecentMonths(months: number): string[] {
  const now = new Date();
  const result: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

/**
 * Render a `YYYY-MM` month key as a short human label, e.g. `Jul 2026`.
 */
export function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;
  const label = new Date(year, monthNumber - 1, 1).toLocaleString('default', { month: 'short' });
  return `${label} ${year}`;
}

/**
 * Last calendar day of a `YYYY-MM` month, as a Date.
 */
export function endOfMonth(month: string): Date {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber, 0);
}
