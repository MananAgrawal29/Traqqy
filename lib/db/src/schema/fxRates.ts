import { pgTable, serial, text, numeric, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Cached daily exchange rates.
 *
 * Uses USD as the pivot currency. One row per currency pair per day.
 * Designed to support historical rates in the future without schema changes.
 *
 * Example rows for a single day:
 *   base=USD, target=EUR, rate=0.8589, date=2026-08-28
 *   base=USD, target=INR, rate=95.39,  date=2026-08-28
 *   base=USD, target=GBP, rate=0.7362, date=2026-08-28
 */
export const fxRatesTable = pgTable(
  "fx_rates",
  {
    id: serial("id").primaryKey(),
    baseCurrency: text("base_currency").notNull(),
    targetCurrency: text("target_currency").notNull(),
    rate: numeric("rate", { precision: 16, scale: 8 }).notNull(),
    rateDate: date("rate_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("fx_rates_base_target_date_idx").on(
      t.baseCurrency,
      t.targetCurrency,
      t.rateDate,
    ),
  ],
);

export type FxRate = typeof fxRatesTable.$inferSelect;
export type InsertFxRate = typeof fxRatesTable.$inferInsert;
