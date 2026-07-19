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
    const rows = await db
      .select()
      .from(subscriptionsTable)
      .leftJoin(categoriesTable, eq(subscriptionsTable.categoryId, categoriesTable.id))
      .where(
        and(
          eq(subscriptionsTable.clerkId, userId),
          eq(subscriptionsTable.isArchived, false),
          gte(subscriptionsTable.renewalDate, startDate),
          lte(subscriptionsTable.renewalDate, endDate),
        )
      )
      .orderBy(subscriptionsTable.renewalDate);

    // Group by date
    const grouped = new Map<string, any[]>();
    for (const row of rows) {
      const date = row.subscriptions.renewalDate;
      const price = parseFloat(row.subscriptions.price);
      const { monthlyEquivalent, annualEquivalent } = calcEquivalents(price, row.subscriptions.billingCycle as BillingCycle);
      const enriched = {
        ...row.subscriptions,
        price,
        monthlyEquivalent,
        annualEquivalent,
        categoryName: row.categories?.name ?? null,
        daysUntilRenewal: daysUntil(row.subscriptions.renewalDate),
      };
      if (!grouped.has(date)) grouped.set(date, []);
      grouped.get(date)!.push(enriched);
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
