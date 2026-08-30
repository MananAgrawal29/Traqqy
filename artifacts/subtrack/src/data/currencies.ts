/**
 * Re-export everything from the shared canonical currency package.
 * This file exists for backward compatibility — all currency definitions
 * now live in @workspace/currencies.
 */
export {
  type Currency,
  currencies,
  SUPPORTED_CURRENCY_CODES,
  COMMON_CURRENCY_CODES,
  isSupportedCurrency,
  getCurrency,
  formatAmount,
} from "@workspace/currencies";
