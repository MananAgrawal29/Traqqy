import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable, categoriesTable, subscriptionSharesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";
import { userSettingsTable } from "@workspace/db";
import { getOrFetchRates } from "../lib/fx-cache";
import { convertAmount, roundMoney } from "@workspace/currencies/convert";
import { calcEquivalents } from "../lib/billing";
import type { BillingCycle } from "../lib/billing";

const router = Router();

/**
 * Get the effective monthly amount for a subscription, returning both
 * the amount and its currency for downstream conversion.
 */
async function getEffectiveMonthlyAmount(sub: any): Promise<{ amount: number; currency: string }> {
  const subType = sub.subscriptionType || "recurring";
  if (subType === "lifetime" || subType === "trial") return { amount: 0, currency: sub.currency || "USD" };
  let price = parseFloat(sub.price);
  if (sub.isShared) {
    const shares = await db.select().from(subscriptionSharesTable).where(eq(subscriptionSharesTable.subscriptionId, sub.id));
    const userShare = shares.find((s: any) => s.isCurrentUser);
    if (userShare) price = parseFloat(userShare.amount);
  }
  const { monthlyEquivalent } = calcEquivalents(price, sub.billingCycle as BillingCycle);
  return { amount: monthlyEquivalent, currency: sub.currency || "USD" };
}

/** Get the user's default currency from settings */
async function getDefaultCurrency(userId: string): Promise<string> {
  const settingsRow = await db.query.userSettingsTable.findFirst({ where: eq(userSettingsTable.clerkId, userId) });
  return settingsRow?.currency || "USD";
}

/**
 * Convert a list of {amount, currency} items to the default currency and sum them.
 * Returns the total and whether all conversions were successful.
 */
async function sumConverted(
  items: Array<{ amount: number; currency: string }>,
  defaultCurrency: string,
): Promise<{ total: number; conversionAvailable: boolean }> {
  if (items.length === 0) return { total: 0, conversionAvailable: true };

  const allSame = items.every((i) => i.currency === defaultCurrency);
  if (allSame) {
    return { total: items.reduce((s, i) => s + i.amount, 0), conversionAvailable: true };
  }

  const rates = await getOrFetchRates(db);
  if (!rates) {
    // Fallback: sum raw values (not ideal but better than failing)
    return { total: items.reduce((s, i) => s + i.amount, 0), conversionAvailable: false };
  }

  let total = 0;
  let conversionAvailable = true;
  for (const item of items) {
    const converted = convertAmount(item.amount, item.currency, defaultCurrency, rates);
    if (converted === null) {
      conversionAvailable = false;
    } else {
      total += converted;
    }
  }
  return { total, conversionAvailable };
}

// ── Spending by category ────────────────────────────────────────────────

router.get("/spending-by-category", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const [rows, defaultCurrency] = await Promise.all([
      db
        .select()
        .from(subscriptionsTable)
        .leftJoin(categoriesTable, eq(subscriptionsTable.categoryId, categoriesTable.id))
        .where(and(eq(subscriptionsTable.clerkId, userId), eq(subscriptionsTable.isArchived, false))),
      getDefaultCurrency(userId),
    ]);

    // Group by category (in original currencies)
    const map = new Map<string, { categoryId: number | null; categoryName: string; color: string; icon: string; items: Array<{ amount: number; currency: string }>; count: number }>();
    let allItems: Array<{ amount: number; currency: string }> = [];

    for (const row of rows) {
      const eff = await getEffectiveMonthlyAmount({ ...row.subscriptions, billingCycle: row.subscriptions.billingCycle });
      if (eff.amount === 0) continue;
      allItems.push({ amount: eff.amount, currency: eff.currency });

      const key = row.categories ? String(row.categories.id) : "uncategorized";
      const existing = map.get(key);
      if (existing) {
        existing.items.push({ amount: eff.amount, currency: eff.currency });
        existing.count++;
      } else {
        map.set(key, {
          categoryId: row.categories?.id ?? null,
          categoryName: row.categories?.name ?? "Uncategorized",
          color: row.categories?.color ?? "#94a3b8",
          icon: row.categories?.icon ?? "Tag",
          items: [{ amount: eff.amount, currency: eff.currency }],
          count: 1,
        });
      }
    }

    // Convert all category totals to default currency
    const categoryResults = await Promise.all(
      Array.from(map.values()).map(async (v) => {
        const { total: monthlyAmount, conversionAvailable } = await sumConverted(v.items, defaultCurrency);
        return {
          categoryId: v.categoryId,
          categoryName: v.categoryName,
          color: v.color,
          icon: v.icon,
          monthlyAmount,
          percentage: 0, // calculated below
          subscriptionCount: v.count,
          conversionAvailable,
        };
      }),
    );

    // Calculate percentages based on converted totals
    const grandTotal = categoryResults.reduce((s, r) => s + r.monthlyAmount, 0);
    for (const r of categoryResults) {
      r.percentage = grandTotal > 0 ? roundMoney((r.monthlyAmount / grandTotal) * 100) : 0;
    }

    // Sort by amount descending
    categoryResults.sort((a, b) => b.monthlyAmount - a.monthlyAmount);

    res.json(categoryResults.map((r) => ({ ...r, defaultCurrency })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Monthly trend ───────────────────────────────────────────────────────

router.get("/monthly-trend", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const [rows, defaultCurrency] = await Promise.all([
      db
        .select()
        .from(subscriptionsTable)
        .where(and(eq(subscriptionsTable.clerkId, userId), eq(subscriptionsTable.isArchived, false))),
      getDefaultCurrency(userId),
    ]);

    // Build 12-month trend (current month + 11 prior)
    const months: { month: number; year: number; label: string; totalAmount: number; subscriptionCount: number }[] = [];
    const now = new Date();
    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

    // Collect all monthly items for conversion
    const allItems: Array<{ amount: number; currency: string }> = [];
    for (const sub of rows) {
      const eff = await getEffectiveMonthlyAmount(sub);
      if (eff.amount === 0) continue;
      allItems.push({ amount: eff.amount, currency: eff.currency });

      for (const m of months) {
        m.subscriptionCount++;
      }
    }

    // Convert total to default currency
    const { total: convertedMonthly, conversionAvailable } = await sumConverted(allItems, defaultCurrency);

    // Apply converted amount to all months (same portfolio across all months)
    res.json(
      months.map((m) => ({
        ...m,
        totalAmount: roundMoney(convertedMonthly),
        defaultCurrency,
        conversionAvailable,
      })),
    );
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Overview ────────────────────────────────────────────────────────────

router.get("/overview", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const [rows, defaultCurrency] = await Promise.all([
      db
        .select()
        .from(subscriptionsTable)
        .where(and(eq(subscriptionsTable.clerkId, userId), eq(subscriptionsTable.isArchived, false))),
      getDefaultCurrency(userId),
    ]);

    let highestExpense: any = null;
    let highestMonthly = 0;
    const allItems: Array<{ amount: number; currency: string }> = [];

    for (const sub of rows) {
      const eff = await getEffectiveMonthlyAmount(sub);
      if (eff.amount === 0) continue;
      allItems.push({ amount: eff.amount, currency: eff.currency });

      if (eff.amount > highestMonthly) {
        highestMonthly = eff.amount;
        highestExpense = { name: sub.name, monthlyEquivalent: eff.amount, currency: eff.currency, price: parseFloat(sub.price), billingCycle: sub.billingCycle };
      }
    }

    const { total: totalMonthly, conversionAvailable } = await sumConverted(allItems, defaultCurrency);
    const count = rows.length;

    // Convert highest expense to default currency
    let convertedHighest = highestExpense;
    if (highestExpense && highestExpense.currency !== defaultCurrency) {
      const rates = await getOrFetchRates(db);
      if (rates) {
        const c = convertAmount(highestExpense.monthlyEquivalent, highestExpense.currency, defaultCurrency, rates);
        if (c !== null) {
          convertedHighest = { ...highestExpense, monthlyEquivalent: roundMoney(c) };
        }
      }
    }

    res.json({
      totalAnnualSpend: roundMoney(totalMonthly * 12),
      averageMonthlySpend: roundMoney(totalMonthly),
      highestExpense: convertedHighest,
      averageSubscriptionCost: count > 0 ? roundMoney(totalMonthly / count) : 0,
      totalSubscriptions: count,
      defaultCurrency,
      conversionAvailable,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
