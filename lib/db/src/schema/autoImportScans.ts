import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const autoImportScansTable = pgTable("auto_import_scans", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull(),
  status: text("status").notNull().default("queued"), // queued | searching | analyzing | scoring | complete | failed
  monthsBack: integer("months_back").notNull().default(12),
  emailsFound: integer("emails_found").notNull().default(0),
  emailsProcessed: integer("emails_processed").notNull().default(0),
  candidatesFound: integer("candidates_found").notNull().default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAutoImportScanSchema = createInsertSchema(autoImportScansTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoImportScan = z.infer<typeof insertAutoImportScanSchema>;
export type AutoImportScan = typeof autoImportScansTable.$inferSelect;
