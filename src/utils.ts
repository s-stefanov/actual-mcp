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
 * Format a local calendar date as YYYY-MM-DD
 */
export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return '';
  if (typeof date === 'string') return date;

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) throw new RangeError('Invalid time value');
  // # Reason: UTC serialization can move local calendar boundaries into an adjacent day or month.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Actual's numberFormat preference -> a locale that groups and separates the same way
const LOCALES: Record<string, string> = {
  'comma-dot': 'en-US',
  'dot-comma': 'de-DE',
  'space-comma': 'fr-FR',
  'apostrophe-dot': 'de-CH',
  'comma-dot-in': 'en-IN',
};
let amountFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/**
 * Format amounts the way the budget file is set up (Settings -> Formatting / Currency in Actual),
 * instead of always as US dollars. Called once the budget is loaded. A file with no currency
 * set gets plain numbers: Actual itself is currency agnostic.
 */
export function setAmountFormat(prefs: { defaultCurrencyCode?: string; numberFormat?: string }): void {
  const locale = LOCALES[prefs.numberFormat ?? ''] ?? 'en-US';
  // Reason: amounts are stored in hundredths for every currency, so always show two decimals.
  // Intl's own default would round a zero-decimal currency (JPY, CLP) to whole units.
  const plain = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  try {
    amountFormat = new Intl.NumberFormat(
      locale,
      prefs.defaultCurrencyCode ? { style: 'currency', currency: prefs.defaultCurrencyCode, ...plain } : plain
    );
  } catch {
    amountFormat = new Intl.NumberFormat(locale, plain); // a currency code Intl does not know
  }
}

/**
 * Format currency amounts for display
 */
export function formatAmount(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return 'N/A';

  // Convert from minor units (cents) to units
  return amountFormat.format(amount / 100);
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
    start: formatDate(start),
    end: formatDate(end),
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
