/**
 * Locale-aware formatting configuration.
 *
 * The budget's synced preferences (currency, number format, symbol placement,
 * date format) live in the Actual budget itself. They are loaded once during API
 * initialization and cached here, so the pure/synchronous report generators can
 * format values without becoming async or taking extra parameters.
 */

export interface FormatConfig {
  locale: string;
  currency: string;
  numberFormat: string;
  hideFraction: boolean;
  currencySymbol: string;
  currencySymbolPosition: 'before' | 'after';
  spaceBetweenAmountAndSymbol: boolean;
  dateFormat: string;
}

/** American defaults, matching the behaviour before this was configurable. */
const DEFAULT_CONFIG: FormatConfig = {
  locale: 'en-US',
  currency: 'USD',
  numberFormat: 'comma-dot',
  hideFraction: false,
  currencySymbol: '$',
  currencySymbolPosition: 'before',
  spaceBetweenAmountAndSymbol: false,
  dateFormat: 'MM/dd/yyyy',
};

let config: FormatConfig = { ...DEFAULT_CONFIG };

/**
 * Map Actual's `numberFormat` preference onto a BCP-47 locale whose
 * `Intl.NumberFormat` grouping/decimal separators match.
 */
const LOCALE_FOR_NUMBER_FORMAT: Record<string, string> = {
  'comma-dot': 'en-US', // 1,234.56
  'dot-comma': 'da-DK', // 1.234,56
  'space-comma': 'fr-FR', // 1 234,56
  'apostrophe-dot': 'de-CH', // 1'234.56
};

export function setFormatConfig(prefs: Record<string, unknown>): void {
  const numberFormat = String(prefs.numberFormat ?? DEFAULT_CONFIG.numberFormat);
  // `defaultCurrencyCode` can legitimately be empty in a fresh budget. An empty
  // code makes Intl fall back to its locale default, so substitute a neutral one
  // and let `currencySymbol` drive what is actually rendered.
  const currency = String(prefs.defaultCurrencyCode || '') || DEFAULT_CONFIG.currency;
  const locale = LOCALE_FOR_NUMBER_FORMAT[numberFormat] ?? LOCALE_FOR_NUMBER_FORMAT[DEFAULT_CONFIG.numberFormat];

  config = {
    locale,
    currency,
    numberFormat,
    hideFraction: String(prefs.hideFraction ?? 'false') === 'true',
    currencySymbol: String(prefs.currencySymbol || ''),
    // Actual stores this as "after" meaning symbol trails the amount.
    currencySymbolPosition: String(prefs.currencySymbolPosition ?? 'before') === 'after' ? 'after' : 'before',
    spaceBetweenAmountAndSymbol: String(prefs.currencySpaceBetweenAmountAndSymbol ?? 'false') === 'true',
    dateFormat: String(prefs.dateFormat || DEFAULT_CONFIG.dateFormat),
  };
}

export function getFormatConfig(): FormatConfig {
  return config;
}

export function resetFormatConfig(): void {
  config = { ...DEFAULT_CONFIG };
}
