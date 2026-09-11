import { getFormatConfig } from './format-config.js';

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
 * Format a date as YYYY-MM-DD.
 *
 * This is the CANONICAL form used for API query parameters — the Actual server
 * only understands ISO dates. For anything shown to a user, use
 * `formatDisplayDate` instead.
 */
export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return '';
  if (typeof date === 'string') return date;

  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Format a date for display according to the budget's `dateFormat` preference.
 *
 * Accepts either an ISO `YYYY-MM-DD` string or a Date. Actual expresses its date
 * format preference as a `d`/`M`/`y` pattern with any separators, in any order
 * (e.g. `dd.MM.yyyy`, `MM/dd/yyyy`, `d. MMM yyyy`). Tokens are matched
 * positionally and re-emitted with the configured separators between them.
 * Falls back to the ISO string if the pattern is unrecognised.
 *
 * Supported tokens: `d`/`dd` (day, padded when `dd`), `M`/`MM` (month number),
 * `MMM`/`MMMM` (abbreviated/full month name), `y`/`yy`/`yyyy` (year).
 */
export function formatDisplayDate(date: Date | string | undefined | null): string {
  if (!date) return '';

  let iso: string;
  let d: Date;
  if (typeof date === 'string') {
    iso = date.slice(0, 10);
    d = new Date(`${iso}T00:00:00Z`);
  } else {
    iso = date.toISOString().slice(0, 10);
    d = date;
  }
  if (Number.isNaN(d.getTime())) return iso;

  const cfg = getFormatConfig();
  const tokens = parseDatePattern(cfg.dateFormat);
  if (!tokens) return iso;

  const year = String(d.getUTCFullYear());
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

  let result = '';
  for (const part of tokens) {
    if (part.kind === 'literal') {
      result += part.value;
      continue;
    }
    const { token } = part;
    if (token.startsWith('d')) {
      result += String(day).padStart(token.length, '0');
    } else if (token.startsWith('M')) {
      result +=
        token.length >= 3
          ? new Intl.DateTimeFormat(cfg.locale, {
              month: token.length >= 4 ? 'long' : 'short',
              timeZone: 'UTC',
            })
              .format(d)
              // Danish abbreviates with a trailing period ("sep."); strip it so
              // the separator the user configured is the only one emitted.
              .replace(/\.$/, '')
          : String(month).padStart(token.length, '0');
    } else {
      result += token.length === 2 ? year.slice(-2) : year;
    }
  }
  return result;
}

type PatternPart = { kind: 'token'; token: string } | { kind: 'literal'; value: string };

/**
 * Split a date pattern into tokens and the literal text between them.
 * Returns null when the pattern contains nothing recognisable.
 */
function parseDatePattern(pattern: string): PatternPart[] | null {
  const parts: PatternPart[] = [];
  const tokenPattern = /[dMy]+/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(pattern)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ kind: 'literal', value: pattern.slice(lastIndex, match.index) });
    }
    parts.push({ kind: 'token', token: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < pattern.length) {
    parts.push({ kind: 'literal', value: pattern.slice(lastIndex) });
  }

  return parts.some((p) => p.kind === 'token') ? parts : null;
}

/**
 * Format currency amounts for display.
 *
 * `amount` is in integer cents, as stored by the Actual API. Output honours the
 * budget's currency, number format, symbol placement and fraction settings.
 */
export function formatAmount(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return 'N/A';

  const cfg = getFormatConfig();
  // Actual stores amounts as integer cents.
  const value = amount / 100;

  const formatter = new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.currency,
    minimumFractionDigits: cfg.hideFraction ? 0 : 2,
    maximumFractionDigits: cfg.hideFraction ? 0 : 2,
    // Use the locale's short symbol ("kr.", "$") rather than the ISO code, but
    // split the result apart below so placement can follow the budget's own
    // preference instead of the locale's default.
    currencyDisplay: 'narrowSymbol',
  });

  const parts = formatter.formatToParts(value);
  const symbolIndex = parts.findIndex((p) => p.type === 'currency');

  // Split into the number and the symbol so the two can be re-ordered. The sign
  // is carried separately: Intl puts it in the "minusSign" part, and the
  // currency part may also absorb a leading "-" in some locales.
  //
  // Intl emits the gap between number and symbol (if any) as a "literal" part.
  // That gap is dropped because spacing is re-applied below from
  // `currencySpaceBetweenAmountAndSymbol`; keeping it would double the space.
  let numberPart = '';
  let symbolPart = '';
  let isNegative = value < 0;

  parts.forEach((part, index) => {
    switch (part.type) {
      case 'currency':
        symbolPart = part.value;
        return;
      case 'minusSign':
        isNegative = true;
        return;
      case 'plusSign':
        return;
      case 'literal': {
        const isGapBesideSymbol =
          part.value.trim() === '' && symbolIndex !== -1 && (index === symbolIndex - 1 || index === symbolIndex + 1);
        if (isGapBesideSymbol) return;
        break;
      }
      default:
        break;
    }
    numberPart += part.value;
  });

  // Fall back to the locale's own symbol when the budget does not specify one.
  const symbol = cfg.currencySymbol || symbolPart;
  const space = cfg.spaceBetweenAmountAndSymbol ? ' ' : '';

  const body =
    !symbol || !symbolPart
      ? numberPart
      : cfg.currencySymbolPosition === 'after'
        ? `${numberPart}${space}${symbol}`
        : `${symbol}${space}${numberPart}`;

  // Keep the sign outside the symbol so it always leads: "-1.234,56 kr".
  return isNegative ? `-${body}` : body;
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
