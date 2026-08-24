import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable, categoriesTable, subscriptionSharesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";
import { calcEquivalents } from "../lib/billing";

const router = Router();

/** Get the effective price: userShare for shared, full price otherwise */
async function getEffectiveMonthlyAmount(sub: any): Promise<number> {
  const subType = sub.subscriptionType || "recurring";
  if (subType === "lifetime" || subType === "trial") return 0;
  let price = parseFloat(sub.price);
  if (sub.isShared) {
    const shares = await db.select().from(subscriptionSharesTable).where(eq(subscriptionSharesTable.subscriptionId, sub.id));
    const userShare = shares.find((s: any) => s.isCurrentUser);
    if (userShare) price = parseFloat(userShare.amount);
  }
  const { monthlyEquivalent } = calcEquivalents(price, sub.billingCycle);
  return monthlyEquivalent;
}

router.get("/spending-by-category", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const rows = await db
      .select()
      .from(subscriptionsTable)
      .leftJoin(categoriesTable, eq(subscriptionsTable.categoryId, categoriesTable.id))
      .where(and(eq(subscriptionsTable.clerkId, userId), eq(subscriptionsTable.isArchived, false)));

    // Group by category
    const map = new Map<string, { categoryId: number | null; categoryName: string; color: string; icon: string; amount: number; count: number }>();
    let total = 0;

    for (const row of rows) {
      const monthlyEquivalent = await getEffectiveMonthlyAmount({ ...row.subscriptions, billingCycle: row.subscriptions.billingCycle });
      if (monthlyEquivalent === 0) continue;
      total += monthlyEquivalent;

      const key = row.categories ? String(row.categories.id) : "uncategorized";
      const existing = map.get(key);
      if (existing) {
        existing.amount += monthlyEquivalent;
        existing.count++;
      } else {
        map.set(key, {
          categoryId: row.categories?.id ?? null,
          categoryName: row.categories?.name ?? "Uncategorized",
          color: row.categories?.color ?? "#94a3b8",
          icon: row.categories?.icon ?? "Tag",
          amount: monthlyEquivalent,
          count: 1,
        });
      }
    }

    const result = Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .map(v => ({
        categoryId: v.categoryId,
        categoryName: v.categoryName,
        color: v.color,
        icon: v.icon,
        monthlyAmount: Math.round(v.amount * 100) / 100,
        percentage: total > 0 ? Math.round((v.amount / total) * 10000) / 100 : 0,
        subscriptionCount: v.count,
      }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/monthly-trend", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const rows = await db
      .select()
      .from(subscriptionsTable)
      .where(and(eq(subscriptionsTable.clerkId, userId), eq(subscriptionsTable.isArchived, false)));

    // Build 12-month trend (current month + 11 prior)
    const months: { month: number; year: number; label: string; totalAmount: number; subscriptionCount: number }[] = [];
    const now = new Date();
    const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
        totalAmount: 0,
        subscriptionCount: 0,
      });
    }

    // Distribute each subscription's monthly cost to months it was/is active
    for (const sub of rows) {
      const monthlyEquivalent = await getEffectiveMonthlyAmount(sub);
      if (monthlyEquivalent === 0) continue;
      const createdAt = new Date(sub.createdAt);

      for (const m of months) {
        const monthStart = new Date(m.year, m.month - 1, 1);
        if (createdAt <= monthStart) {
          m.totalAmount += monthlyEquivalent;
          m.subscriptionCount++;
        }
      }
    }

    res.json(months.map(m => ({ ...m, totalAmount: Math.round(m.totalAmount * 100) / 100 })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/overview", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const rows = await db
      .select()
      .from(subscriptionsTable)
      .where(and(eq(subscriptionsTable.clerkId, userId), eq(subscriptionsTable.isArchived, false)));

    let totalMonthly = 0;
    let highestExpense: any = null;
    let highestMonthly = 0;

    for (const sub of rows) {
      const monthlyEquivalent = await getEffectiveMonthlyAmount(sub);
      if (monthlyEquivalent === 0) continue;
      const price = parseFloat(sub.price);
      totalMonthly += monthlyEquivalent;
      if (monthlyEquivalent > highestMonthly) {
        highestMonthly = monthlyEquivalent;
        highestExpense = { name: sub.name, monthlyEquivalent, price, billingCycle: sub.billingCycle };
      }
    }

    const count = rows.length;
    res.json({
      totalAnnualSpend: Math.round(totalMonthly * 12 * 100) / 100,
      averageMonthlySpend: Math.round(totalMonthly * 100) / 100,
      highestExpense,
      averageSubscriptionCost: count > 0 ? Math.round((totalMonthly / count) * 100) / 100 : 0,
      totalSubscriptions: count,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
