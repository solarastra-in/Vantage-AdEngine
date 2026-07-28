/**
 * i18n.ts
 *
 * Every dollar figure in the app was previously hardcoded as `$${n.toLocaleString()}`
 * -- a fixed USD symbol with the browser's default locale, regardless of
 * which organization or region is actually using the platform. This is the
 * real internationalization layer: currency and number/date formatting
 * driven by each organization's configured currency + locale (see
 * Organization.currency / Organization.locale in firestoreService.ts),
 * using the browser-native Intl APIs rather than a bespoke formatter.
 */

export interface SupportedCurrency {
  code: string;
  symbol: string;
  name: string;
}

/** A representative set covering the regions Vantage's own pricing/plan copy already references (US, EU, UK, India, APAC, MENA). */
export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

export interface SupportedLocale {
  code: string;
  label: string;
}

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'de-DE', label: 'Deutsch (Germany)' },
  { code: 'fr-FR', label: 'Français (France)' },
  { code: 'ja-JP', label: '日本語 (Japan)' },
  { code: 'ar-AE', label: 'العربية (UAE)' },
];

export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_LOCALE = 'en-US';

/**
 * Formats a monetary amount using the org's configured currency + locale.
 * Falls back gracefully to USD/en-US if either is missing or the browser
 * doesn't recognize the pairing, rather than throwing and breaking a
 * dashboard render over a bad locale string.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
  opts: { maximumFractionDigits?: number } = {}
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: opts.maximumFractionDigits ?? (Number.isInteger(amount) ? 0 : 2),
    }).format(amount);
  } catch {
    // Unknown currency/locale pairing -- fall back rather than crash the render.
    return new Intl.NumberFormat(DEFAULT_LOCALE, { style: 'currency', currency: DEFAULT_CURRENCY }).format(amount);
  }
}

/** A compact form for dashboard tiles: $1.2K / $3.4M instead of the full $1,234,567. */
export function formatCurrencyCompact(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }
}

/** Plain (non-currency) number formatting -- e.g. impressions, clicks -- respecting locale grouping/decimal conventions. */
export function formatNumber(value: number, locale: string = DEFAULT_LOCALE, maximumFractionDigits = 0): string {
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
  } catch {
    return new Intl.NumberFormat(DEFAULT_LOCALE, { maximumFractionDigits }).format(value);
  }
}

/** Locale-aware percentage formatting (e.g. some locales use a different decimal separator or place the % sign differently). */
export function formatPercent(value: number, locale: string = DEFAULT_LOCALE, maximumFractionDigits = 1): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits }).format(value / 100);
  } catch {
    return `${value.toFixed(maximumFractionDigits)}%`;
  }
}

/** Locale-aware date formatting, replacing ad-hoc `new Date(x).toLocaleDateString()` calls with no explicit locale. */
export function formatDate(
  date: string | Date,
  locale: string = DEFAULT_LOCALE,
  opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat(locale, opts).format(d);
  } catch {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, opts).format(d);
  }
}

export function getCurrencySymbol(currencyCode: string = DEFAULT_CURRENCY): string {
  return SUPPORTED_CURRENCIES.find(c => c.code === currencyCode)?.symbol ?? '$';
}
