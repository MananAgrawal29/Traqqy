import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable, categoriesTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";
import { calcEquivalents, daysUntil } from "../lib/billing";
import type { BillingCycle } from "../lib/billing";

const router = Router();

function enrichSub(sub: any, category: any) {
  const price = parseFloat(sub.price);
  const { monthlyEquivalent, annualEquivalent } = calcEquivalents(price, sub.billingCycle as BillingCycle);
  return {
    ...sub,
    price,
    monthlyEquivalent,
    annualEquivalent,
    categoryName: category?.name ?? null,
    daysUntilRenewal: sub.isArchived ? null : daysUntil(sub.renewalDate),
  };
}

router.get("/summary", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const allSubs = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.clerkId, userId));

    const activeSubs = allSubs.filter(s => !s.isArchived && s.isActive);
    const archivedSubs = allSubs.filter(s => s.isArchived);

    let monthlySpend = 0;
    let nextRenewalDays: number | null = null;
    let upcomingCount = 0;

    for (const sub of activeSubs) {
      const price = parseFloat(sub.price);
      const { monthlyEquivalent } = calcEquivalents(price, sub.billingCycle as BillingCycle);
      monthlySpend += monthlyEquivalent;

      const days = daysUntil(sub.renewalDate);
      if (days !== null && days >= 0 && days <= 7) upcomingCount++;
      if (days !== null && days >= 0 && (nextRenewalDays === null || days < nextRenewalDays)) {
        nextRenewalDays = days;
      }
    }

    res.json({
      totalActiveSubscriptions: activeSubs.length,
      totalArchivedSubscriptions: archivedSubs.length,
      monthlySpend: Math.round(monthlySpend * 100) / 100,
      yearlySpend: Math.round(monthlySpend * 12 * 100) / 100,
      upcomingRenewalsCount: upcomingCount,
      nextRenewalDays,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/upcoming-renewals", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const today = new Date();
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  const todayStr = today.toISOString().split("T")[0];
  const endStr = thirtyDaysLater.toISOString().split("T")[0];

  try {
    const rows = await db
      .select()
      .from(subscriptionsTable)
      .leftJoin(categoriesTable, eq(subscriptionsTable.categoryId, categoriesTable.id))
      .where(
        and(
          eq(subscriptionsTable.clerkId, userId),
          eq(subscriptionsTable.isArchived, false),
          gte(subscriptionsTable.renewalDate, todayStr),
          lte(subscriptionsTable.renewalDate, endStr),
        )
      )
      .orderBy(subscriptionsTable.renewalDate);

    res.json(rows.map(r => enrichSub(r.subscriptions, r.categories)));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/recent-activity", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const rows = await db
      .select()
      .from(subscriptionsTable)
      .leftJoin(categoriesTable, eq(subscriptionsTable.categoryId, categoriesTable.id))
      .where(eq(subscriptionsTable.clerkId, userId))
      .orderBy(desc(subscriptionsTable.updatedAt))
      .limit(10);

    res.json(rows.map(r => enrichSub(r.subscriptions, r.categories)));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
