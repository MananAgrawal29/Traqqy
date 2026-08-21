import { pgTable, text, serial, timestamp, integer, numeric, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { autoImportScansTable } from "./autoImportScans";
import { subscriptionsTable } from "./subscriptions";

export const autoImportCandidatesTable = pgTable("auto_import_candidates", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id").notNull().references(() => autoImportScansTable.id, { onDelete: "cascade" }),
  clerkId: text("clerk_id").notNull(),
  merchantName: text("merchant_name").notNull(),
  catalogMatchId: text("catalog_match_id"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  billingCycle: text("billing_cycle"), // weekly | monthly | quarterly | semi_annual | yearly
  lastPaymentDate: date("last_payment_date", { mode: "string" }),
  confidence: integer("confidence").notNull(),
  confidenceLabel: text("confidence_label").notNull(), // high | medium | low
  reasons: jsonb("reasons").notNull().default([]).$type<string[]>(),
  evidenceCount: integer("evidence_count").notNull().default(1),
  duplicateOfSubscriptionId: integer("duplicate_of_subscription_id").references(() => subscriptionsTable.id),
  emailSender: text("email_sender"),
  emailSubject: text("email_subject"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAutoImportCandidateSchema = createInsertSchema(autoImportCandidatesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoImportCandidate = z.infer<typeof insertAutoImportCandidateSchema>;
export type AutoImportCandidate = typeof autoImportCandidatesTable.$inferSelect;
