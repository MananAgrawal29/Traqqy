/**
 * FX rate caching layer.
 *
 * Strategy: USD pivot, one Frankfurter call per day.
 * - Check DB for today's rates (base=USD)
 * - If missing: fetch from Frankfurter, store in DB (with lock to prevent concurrent fetches)
 * - If present: return from DB
 *
 * Returns a flat map: { USD: 1, EUR: 0.8589, INR: 95.39, ... }
 */

import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, and, desc } from "drizzle-orm";
import { fxRatesTable } from "@workspace/db";
import { SUPPORTED_CURRENCY_CODES } from "@workspace/currencies";
import { fetchLatestRates } from "./fx-rates";

const USD = "USD";

// In-memory lock to prevent concurrent Frankfurter fetches.
// If a fetch is in progress, subsequent callers await the same promise
// rather than each triggering a separate API call.
let pendingFetch: Promise<Record<string, number> | null> | null = null;

/**
 * Get today's date as YYYY-MM-DD in UTC.
 */
function todayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get or fetch exchange rates for all supported currencies relative to USD.
 *
 * Returns a flat map: { USD: 1, EUR: 0.8589, INR: 95.39, ... }
 * Returns null if rates are completely unavailable.
 */
export async function getOrFetchRates(
  db: NodePgDatabase<any>,
): Promise<Record<string, number> | null> {
  const today = todayUTC();
  const targetCurrencies = SUPPORTED_CURRENCY_CODES.filter((c) => c !== USD);

  // 1. Check if today's rates exist in DB
  const existingRates = await db
    .select()
    .from(fxRatesTable)
    .where(
      and(
        eq(fxRatesTable.baseCurrency, USD),
        eq(fxRatesTable.rateDate, today),
      ),
    );

  if (existingRates.length > 0) {
    // Build flat map from DB rows
    const rates: Record<string, number> = { [USD]: 1 };
    for (const row of existingRates) {
      rates[row.targetCurrency] = parseFloat(row.rate);
    }
    return rates;
  }

  // 2. Today's rates not in DB — use in-memory lock to prevent concurrent fetches
  if (!pendingFetch) {
    pendingFetch = (async () => {
      try {
        console.log(`[fx-cache] Fetching fresh rates from Frankfurter (base=USD, date=${today})`);
        const result = await fetchLatestRates(USD, targetCurrencies);

        if (!result) {
          return await getStaleRates(db);
        }

        // Store today's rates in DB
        try {
          const rows = targetCurrencies
            .filter((c) => result.rates[c] != null)
            .map((c) => ({
              baseCurrency: USD,
              targetCurrency: c,
              rate: String(result.rates[c]),
              rateDate: result.date,
            }));

          if (rows.length > 0) {
            await db.insert(fxRatesTable).values(rows).onConflictDoNothing();
          }
        } catch (err) {
          console.error("[fx-cache] Failed to store rates in DB:", err);
        }

        // Build and return rates from API response
        const rates: Record<string, number> = { [USD]: 1 };
        for (const c of targetCurrencies) {
          if (result.rates[c] != null) {
            rates[c] = result.rates[c];
          }
        }
        return rates;
      } finally {
        pendingFetch = null;
      }
    })();
  }

  return pendingFetch;
}

/**
 * Get the most recent cached rates from DB (for fallback when API is down).
 */
async function getStaleRates(
  db: NodePgDatabase<any>,
): Promise<Record<string, number> | null> {
  try {
    // Get the most recent rate_date for USD base
    const latestDate = await db
      .select({ rateDate: fxRatesTable.rateDate })
      .from(fxRatesTable)
      .where(eq(fxRatesTable.baseCurrency, USD))
      .orderBy(desc(fxRatesTable.rateDate))
      .limit(1);

    if (latestDate.length === 0) return null;

    const staleRows = await db
      .select()
      .from(fxRatesTable)
      .where(
        and(
          eq(fxRatesTable.baseCurrency, USD),
          eq(fxRatesTable.rateDate, latestDate[0].rateDate),
        ),
      );

    if (staleRows.length === 0) return null;

    console.warn(
      `[fx-cache] Using stale rates from ${latestDate[0].rateDate}`,
    );

    const rates: Record<string, number> = { [USD]: 1 };
    for (const row of staleRows) {
      rates[row.targetCurrency] = parseFloat(row.rate);
    }
    return rates;
  } catch {
    return null;
  }
}
