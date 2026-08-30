/**
 * Frankfurter API client for exchange rates.
 *
 * Uses the v1 API (ECB data, 29 currencies, no API key required).
 * Base URL: https://api.frankfurter.dev/v1
 *
 * Strategy: One call with base=USD fetches all rates in a single request.
 */

const FRANKFURTER_BASE_URL = "https://api.frankfurter.dev/v1";
const TIMEOUT_MS = 15_000;

export interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

/**
 * Fetch the latest exchange rates from Frankfurter.
 *
 * @param baseCurrency - The base currency (typically "USD")
 * @param targetCurrencies - Array of currency codes to fetch (e.g., ["EUR", "INR", "GBP"])
 * @returns Rates map and date, or null on failure
 */
export async function fetchLatestRates(
  baseCurrency: string,
  targetCurrencies: string[],
): Promise<{ rates: Record<string, number>; date: string } | null> {
  try {
    const symbols = targetCurrencies.join(",");
    const url = `${FRANKFURTER_BASE_URL}/latest?base=${baseCurrency}&symbols=${symbols}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(
        `[fx-rates] Frankfurter returned ${response.status}: ${response.statusText}`,
      );
      return null;
    }

    const data = (await response.json()) as FrankfurterResponse;

    // Validate response structure
    if (!data.rates || typeof data.rates !== "object" || !data.date) {
      console.error("[fx-rates] Invalid response structure from Frankfurter");
      return null;
    }

    return { rates: data.rates, date: data.date };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[fx-rates] Frankfurter request timed out");
    } else {
      console.error("[fx-rates] Frankfurter request failed:", err);
    }
    return null;
  }
}
