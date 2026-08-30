/**
 * Central currency conversion utility.
 *
 * Uses USD as the pivot currency. Rates are a flat map:
 *   { USD: 1, EUR: 0.8589, INR: 95.39, ... }
 *
 * Conversion formula for INR→EUR:
 *   amount / rates["INR"] * rates["EUR"]
 *
 * This function does NOT round. Callers should round only
 * at the final display boundary.
 */

/**
 * Convert an amount from one currency to another using USD-pivot rates.
 *
 * @param amount - The amount in the source currency
 * @param fromCurrency - Source currency code (e.g., "INR")
 * @param toCurrency - Target currency code (e.g., "EUR")
 * @param usdRates - Flat map of currency → USD rate (e.g., { USD: 1, EUR: 0.8589, INR: 95.39 })
 * @returns Converted amount with full precision, or null if conversion is not possible
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  usdRates: Record<string, number>,
): number | null {
  // Same currency — no conversion needed
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const fromRate = usdRates[fromCurrency];
  const toRate = usdRates[toCurrency];

  // Missing rate for either currency — cannot convert
  if (fromRate == null || toRate == null) {
    return null;
  }

  // Guard against zero rates (shouldn't happen but defensive)
  if (fromRate === 0) {
    return null;
  }

  // Convert: source → USD → target
  // amount / fromRate gives USD value, * toRate gives target value
  return (amount / fromRate) * toRate;
}

/**
 * Round a monetary amount to 2 decimal places.
 * Use this only at the final display boundary, not during calculations.
 */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}
