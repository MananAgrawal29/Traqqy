import { pgTable, text, serial, timestamp, boolean, numeric, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull(),
  name: text("name").notNull(),
  icon: text("icon"),
  categoryId: integer("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  billingCycle: text("billing_cycle").notNull(), // weekly | monthly | quarterly | semi_annual | yearly
  renewalDate: date("renewal_date", { mode: "string" }),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  subscriptionType: text("subscription_type").notNull().default("recurring"), // recurring | trial | lifetime
  trialEndsAt: date("trial_ends_at", { mode: "string" }),
  trialConvertsToRecurring: boolean("trial_converts_to_recurring"),
  recurringPrice: numeric("recurring_price", { precision: 10, scale: 2 }),
  recurringBillingCycle: text("recurring_billing_cycle"), // billing cycle after trial converts
  purchaseDate: date("purchase_date", { mode: "string" }),
    isShared: boolean("is_shared").notNull().default(false),
  splitMode: text("split_mode").notNull().default("equal"), // equal | custom
  isActive: boolean("is_active").notNull().default(true),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
