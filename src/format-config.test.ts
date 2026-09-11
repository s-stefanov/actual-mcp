import { afterEach, describe, expect, it } from 'vitest';
import { formatAmount, formatDate, formatDisplayDate } from './utils.js';
import { resetFormatConfig, setFormatConfig, getFormatConfig } from './format-config.js';

/** The Danish preferences as actually stored by the budget under test. */
const DANISH = {
  defaultCurrencyCode: 'DKK',
  numberFormat: 'dot-comma',
  hideFraction: 'false',
  currencySymbol: 'kr',
  currencySymbolPosition: 'after',
  currencySpaceBetweenAmountAndSymbol: 'true',
  firstDayOfWeekIdx: '1',
  dateFormat: 'dd.MM.yyyy',
};

const AMERICAN = {
  defaultCurrencyCode: 'USD',
  numberFormat: 'comma-dot',
  hideFraction: 'false',
  currencySymbol: '$',
  currencySymbolPosition: 'before',
  currencySpaceBetweenAmountAndSymbol: 'false',
  dateFormat: 'MM/dd/yyyy',
};

afterEach(() => resetFormatConfig());

describe('formatAmount', () => {
  it('formats Danish amounts with dot grouping, comma decimals and trailing symbol', () => {
    setFormatConfig(DANISH);
    expect(formatAmount(123456789)).toBe('1.234.567,89 kr');
  });

  it('keeps the sign outside a trailing symbol', () => {
    setFormatConfig(DANISH);
    expect(formatAmount(-123456789)).toBe('-1.234.567,89 kr');
  });

  it('always shows two decimals when hideFraction is false', () => {
    setFormatConfig(DANISH);
    expect(formatAmount(0)).toBe('0,00 kr');
    expect(formatAmount(1230)).toBe('12,30 kr');
  });

  it('omits decimals when hideFraction is true', () => {
    setFormatConfig({ ...DANISH, hideFraction: 'true' });
    expect(formatAmount(123456)).toBe('1.235 kr');
  });

  it('places a leading symbol without a space by default', () => {
    setFormatConfig(AMERICAN);
    expect(formatAmount(123456789)).toBe('$1,234,567.89');
  });

  it('places a leading symbol with a space when configured', () => {
    setFormatConfig({ ...AMERICAN, currencySpaceBetweenAmountAndSymbol: 'true' });
    expect(formatAmount(123456)).toBe('$ 1,234.56');
  });

  it('puts the negative sign before a leading symbol, not after it', () => {
    setFormatConfig(AMERICAN);
    expect(formatAmount(-123456)).toBe('-$1,234.56');
  });

  it('puts the negative sign before a trailing symbol', () => {
    setFormatConfig(DANISH);
    expect(formatAmount(-123456)).toBe('-1.234,56 kr');
  });

  it('handles a missing amount', () => {
    setFormatConfig(DANISH);
    expect(formatAmount(undefined)).toBe('N/A');
    expect(formatAmount(null)).toBe('N/A');
  });

  it('does not fall back to USD grouping when the currency code is empty', () => {
    // Fresh budgets have defaultCurrencyCode === ''. Grouping must still follow
    // the Danish number format rather than Intl's locale default.
    setFormatConfig({ ...DANISH, defaultCurrencyCode: '' });
    expect(formatAmount(123456789)).toBe('1.234.567,89 kr');
  });
});

describe('formatDate', () => {
  it('always returns ISO, regardless of the date format preference', () => {
    // This is the form used for API query parameters; it must not localise.
    setFormatConfig(DANISH);
    expect(formatDate(new Date('2026-09-11T00:00:00Z'))).toBe('2026-09-11');
  });

  it('passes strings through unchanged', () => {
    setFormatConfig(DANISH);
    expect(formatDate('2026-09-11')).toBe('2026-09-11');
  });
});

describe('formatDisplayDate', () => {
  it('formats ISO dates as dd.MM.yyyy for Danish', () => {
    setFormatConfig(DANISH);
    expect(formatDisplayDate('2026-09-11')).toBe('11.09.2026');
  });

  it('formats ISO dates as MM/dd/yyyy for American', () => {
    setFormatConfig(AMERICAN);
    expect(formatDisplayDate('2026-09-11')).toBe('09/11/2026');
  });

  it('handles a two-digit year pattern', () => {
    setFormatConfig({ ...DANISH, dateFormat: 'dd.MM.yy' });
    expect(formatDisplayDate('2026-09-11')).toBe('11.09.26');
  });

  it('handles a dash separator', () => {
    setFormatConfig({ ...DANISH, dateFormat: 'dd-MM-yyyy' });
    expect(formatDisplayDate('2026-09-11')).toBe('11-09-2026');
  });

  it('renders a month name for a month-name pattern', () => {
    setFormatConfig({ ...DANISH, dateFormat: 'd. MMM yyyy' });
    expect(formatDisplayDate('2026-09-11')).toBe('11. sep 2026');
  });

  it('accepts a Date as well as a string', () => {
    setFormatConfig(DANISH);
    expect(formatDisplayDate(new Date('2026-09-11T00:00:00Z'))).toBe('11.09.2026');
  });

  it('falls back to ISO when the pattern is unrecognised', () => {
    setFormatConfig({ ...DANISH, dateFormat: 'nonsense' });
    expect(formatDisplayDate('2026-09-11')).toBe('2026-09-11');
  });

  it('handles a missing date', () => {
    setFormatConfig(DANISH);
    expect(formatDisplayDate(undefined)).toBe('');
    expect(formatDisplayDate(null)).toBe('');
  });
});

describe('setFormatConfig', () => {
  it('defaults to American formatting before any preferences load', () => {
    const cfg = getFormatConfig();
    expect(cfg.locale).toBe('en-US');
    expect(cfg.currency).toBe('USD');
  });

  it('maps each Actual number format to a matching locale', () => {
    const cases: Array<[string, string]> = [
      ['comma-dot', 'en-US'],
      ['dot-comma', 'da-DK'],
      ['space-comma', 'fr-FR'],
      ['apostrophe-dot', 'de-CH'],
    ];
    for (const [numberFormat, locale] of cases) {
      setFormatConfig({ numberFormat, defaultCurrencyCode: 'DKK' });
      expect(getFormatConfig().locale).toBe(locale);
    }
  });

  it('falls back to the default locale for an unknown number format', () => {
    setFormatConfig({ numberFormat: 'wat', defaultCurrencyCode: 'DKK' });
    expect(getFormatConfig().locale).toBe('en-US');
  });
});
