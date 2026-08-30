/**
 * Server-side currency conversion utility.
 *
 * Uses the shared convertAmount from @workspace/currencies/convert
 * and provides server-specific helpers for aggregate calculations.
 */

import { convertAmount, roundMoney } from "@workspace/currencies/convert";

export { convertAmount, roundMoney };

/**
 * Convert a subscription's effective monthly amount to the user's default currency.
 *
 * @param amount - The monthly equivalent in the subscription's original currency
 * @param fromCurrency - The subscription's currency
 * @param toCurrency - The user's default currency
 * @param usdRates - Flat USD-pivot rates map
 * @returns Converted amount, or null if conversion is not possible
 */
export function convertMonthlyToDefault(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  usdRates: Record<string, number>,
): number | null {
  return convertAmount(amount, fromCurrency, toCurrency, usdRates);
}

/**
 * Convert an array of { amount, currency } items to a target currency,
 * summing the results.
 *
 * @param items - Array of { amount, currency } objects
 * @param toCurrency - Target currency
 * @param usdRates - Flat USD-pivot rates map
 * @returns { total, conversionAvailable }
 *   - total: sum of all converted amounts (rounded to 2 decimal places)
 *   - conversionAvailable: false if any item could not be converted
 */
export function sumConverted(
  items: Array<{ amount: number; currency: string }>,
  toCurrency: string,
  usdRates: Record<string, number>,
): { total: number; conversionAvailable: boolean } {
  let total = 0;
  let conversionAvailable = true;

  for (const item of items) {
    const converted = convertAmount(
      item.amount,
      item.currency,
      toCurrency,
      usdRates,
    );

    if (converted === null) {
      // Cannot convert this item — mark as unavailable
      conversionAvailable = false;
    } else {
      total += converted;
    }
  }

  return {
    total: roundMoney(total),
    conversionAvailable,
  };
}

/**
 * Check if all currencies in a list are the same as the target currency.
 * If so, conversion can be skipped entirely.
 */
export function allSameCurrency(
  items: Array<{ currency: string }>,
  targetCurrency: string,
): boolean {
  return items.every((item) => item.currency === targetCurrency);
}
