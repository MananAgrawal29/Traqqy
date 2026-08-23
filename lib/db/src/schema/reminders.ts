import { pgTable, text, serial, timestamp, boolean, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subscriptionsTable } from "./subscriptions";

export const remindersTable = pgTable("reminders", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull(),
  subscriptionId: integer("subscription_id").notNull().references(() => subscriptionsTable.id, { onDelete: "cascade" }),
  daysBefore: integer("days_before").notNull(), // 1, 3, 7, 14, 30
  isEnabled: boolean("is_enabled").notNull().default(true),
  // Scheduling: when the reminder should be sent
  scheduledSendAt: timestamp("scheduled_send_at", { withTimezone: true }),
  // Execution tracking
  status: text("status").notNull().default("pending"), // pending | processing | sent | failed | cancelled
  sentAt: timestamp("sent_at", { withTimezone: true }),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  // Prevent duplicate reminders: one reminder per subscription per daysBefore value per user
  uniqueIndex("reminders_subscription_days_idx").on(table.subscriptionId, table.daysBefore),
]);

export const insertReminderSchema = createInsertSchema(remindersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof remindersTable.$inferSelect;
