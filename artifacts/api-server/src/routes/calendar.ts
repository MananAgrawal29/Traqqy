import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable, categoriesTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";
import { calcEquivalents, daysUntil } from "../lib/billing";
import type { BillingCycle } from "../lib/billing";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { year, month } = req.query as Record<string, string>;

  if (!year || !month) {
    res.status(400).json({ error: "year and month are required" });
    return;
  }

  const y = parseInt(year);
  const m = parseInt(month);
  const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  try {
    // Query 1: Recurring subscriptions with renewal dates in this month
    const recurringRows = await db
      .select()
      .from(subscriptionsTable)
      .leftJoin(categoriesTable, eq(subscriptionsTable.categoryId, categoriesTable.id))
      .where(
        and(
          eq(subscriptionsTable.clerkId, userId),
          eq(subscriptionsTable.isArchived, false),
          eq(subscriptionsTable.subscriptionType, "recurring"),
          gte(subscriptionsTable.renewalDate, startDate),
          lte(subscriptionsTable.renewalDate, endDate),
        )
      )
      .orderBy(subscriptionsTable.renewalDate);

    // Query 2: Trial subscriptions with trialEndsAt in this month
    const trialRows = await db
      .select()
      .from(subscriptionsTable)
      .leftJoin(categoriesTable, eq(subscriptionsTable.categoryId, categoriesTable.id))
      .where(
        and(
          eq(subscriptionsTable.clerkId, userId),
          eq(subscriptionsTable.isArchived, false),
          eq(subscriptionsTable.subscriptionType, "trial"),
          gte(subscriptionsTable.trialEndsAt, startDate),
          lte(subscriptionsTable.trialEndsAt, endDate),
        )
      )
      .orderBy(subscriptionsTable.trialEndsAt);

    // Group by date
    const grouped = new Map<string, any[]>();

    // Add recurring events
    for (const row of recurringRows) {
      const rd = row.subscriptions.renewalDate as string | null;
      if (!rd) continue;
      const price = parseFloat(row.subscriptions.price);
      const { monthlyEquivalent, annualEquivalent } = calcEquivalents(price, row.subscriptions.billingCycle as BillingCycle);
      const enriched = {
        ...row.subscriptions,
        price,
        monthlyEquivalent,
        annualEquivalent,
        categoryName: row.categories?.name ?? null,
        daysUntilRenewal: daysUntil(rd),
        eventType: "renewal",
      };
      if (!grouped.has(rd)) grouped.set(rd, []);
      grouped.get(rd)!.push(enriched);
    }

    // Add trial expiration events
    for (const row of trialRows) {
      const td = row.subscriptions.trialEndsAt as string | null;
      if (!td) continue;
      const price = parseFloat(row.subscriptions.price);
      const { monthlyEquivalent, annualEquivalent } = calcEquivalents(price, row.subscriptions.billingCycle as BillingCycle);
      const enriched = {
        ...row.subscriptions,
        price,
        monthlyEquivalent,
        annualEquivalent,
        categoryName: row.categories?.name ?? null,
        daysUntilRenewal: daysUntil(td),
        eventType: "trial_expiration",
      };
      if (!grouped.has(td)) grouped.set(td, []);
      grouped.get(td)!.push(enriched);
    }

    const result = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, subscriptions]) => ({ date, subscriptions }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
