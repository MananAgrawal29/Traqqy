/**
 * Canonical currency configuration for Traqqy.
 * Single source of truth — all currency selectors, formatters,
 * and validation must use this list.
 */

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export const currencies: Currency[] = [
  { code: "INR", symbol: "₹",  name: "Indian Rupee",           flag: "🇮🇳" },
  { code: "USD", symbol: "$",  name: "US Dollar",              flag: "🇺🇸" },
  { code: "EUR", symbol: "€",  name: "Euro",                   flag: "🇪🇺" },
  { code: "GBP", symbol: "£",  name: "British Pound",          flag: "🇬🇧" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar",        flag: "🇨🇦" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar",      flag: "🇦🇺" },
  { code: "JPY", symbol: "¥",  name: "Japanese Yen",           flag: "🇯🇵" },
  { code: "CNY", symbol: "¥",  name: "Chinese Yuan",           flag: "🇨🇳" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar",       flag: "🇸🇬" },
  { code: "TRY", symbol: "₺",  name: "Turkish Lira",           flag: "🇹🇷" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc",            flag: "🇨🇭" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar",   flag: "🇳🇿" },
  { code: "KRW", symbol: "₩",  name: "South Korean Won",       flag: "🇰🇷" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar",     flag: "🇭🇰" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty",           flag: "🇵🇱" },
];

/** All supported currency codes */
export const SUPPORTED_CURRENCY_CODES = currencies.map((c) => c.code);

/**
 * All 15 currencies are considered "common" — there is no separate
 * subset since we only support 15 total.
 */
export const COMMON_CURRENCY_CODES = SUPPORTED_CURRENCY_CODES;

/** Set for O(1) membership checks */
const SUPPORTED_SET = new Set(SUPPORTED_CURRENCY_CODES);

/** Check if a currency code is supported */
export function isSupportedCurrency(code: string): boolean {
  return SUPPORTED_SET.has(code);
}

/** Look up a currency by code */
export function getCurrency(code: string): Currency | undefined {
  return currencies.find((c) => c.code === code);
}

/**
 * Format a monetary amount using Intl.NumberFormat.
 * Falls back to manual formatting if Intl fails.
 */
export function formatAmount(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const c = getCurrency(currencyCode);
    return `${c?.symbol ?? currencyCode}${amount.toFixed(2)}`;
  }
}
