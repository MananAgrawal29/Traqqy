import { pgTable, serial, text, boolean, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subscriptionsTable } from "./subscriptions";

export const subscriptionSharesTable = pgTable("subscription_shares", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").notNull().references(() => subscriptionsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  isCurrentUser: boolean("is_current_user").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubscriptionShareSchema = createInsertSchema(subscriptionSharesTable).omit({ id: true, createdAt: true });
export type InsertSubscriptionShare = z.infer<typeof insertSubscriptionShareSchema>;
export type SubscriptionShare = typeof subscriptionSharesTable.$inferSelect;
