import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable, categoriesTable, subscriptionSharesTable } from "@workspace/db";
import { eq, and, ilike, gte, lte, or, asc, desc } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";
import { calcEquivalents, daysUntil } from "../lib/billing";
import type { BillingCycle } from "../lib/billing";

const router = Router();

function enrichSub(sub: any, category: any) {
  const subscriptionType = sub.subscriptionType || "recurring";
  const price = parseFloat(sub.price);
  const { monthlyEquivalent, annualEquivalent } = calcEquivalents(price, sub.billingCycle as BillingCycle);
  return {
    ...sub,
    price,
    monthlyEquivalent,
    annualEquivalent,
    categoryName: category?.name ?? null,
    daysUntilRenewal: sub.isArchived ? null : (
    subscriptionType === "lifetime" ? null :
    subscriptionType === "trial" && sub.trialEndsAt ? daysUntil(sub.trialEndsAt) :
    sub.renewalDate ? daysUntil(sub.renewalDate) : null
  ),
    subscriptionType,
    trialEndsAt: sub.trialEndsAt || null,
    trialConvertsToRecurring: sub.trialConvertsToRecurring ?? null,
    recurringPrice: sub.recurringPrice ? parseFloat(sub.recurringPrice) : null,
    recurringBillingCycle: sub.recurringBillingCycle || null,
    purchaseDate: sub.purchaseDate || null,
    isShared: sub.isShared || false,
    splitMode: sub.splitMode || "equal",
  };
}

/** Fetch shares */
async function getShares(subscriptionId: number) { return db.select().from(subscriptionSharesTable).where(eq(subscriptionSharesTable.subscriptionId, subscriptionId)); }
/** Delete shares */
async function deleteShares(subscriptionId: number) { await db.delete(subscriptionSharesTable).where(eq(subscriptionSharesTable.subscriptionId, subscriptionId)); }
/** Upsert shares */
async function upsertShares(subscriptionId: number, shares: { name: string; amount: number; isCurrentUser: boolean }[]) { await deleteShares(subscriptionId); if (shares.length > 0) await db.insert(subscriptionSharesTable).values(shares.map(s => ({ subscriptionId, name: s.name, amount: s.amount.toString(), isCurrentUser: s.isCurrentUser }))); }
/** Equal split */
function calculateEqualSplit(total: number, count: number): number[] { if (count <= 0) return []; const base = Math.floor(total * 100 / count) / 100; const shares = Array(count).fill(base); let rem = Math.round((total - base * count) * 100); for (let i = count - 1; i >= 0 && rem > 0; i--) { shares[i] = Math.round((shares[i] + 0.01) * 100) / 100; rem--; } return shares; }

router.get("/", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { status, categoryId, billingCycle, search, minPrice, maxPrice, sortBy, sortOrder } = req.query as Record<string, string>;

  try {
    const conditions = [eq(subscriptionsTable.clerkId, userId)];

    if (status === "active")   conditions.push(eq(subscriptionsTable.isArchived, false));
    else if (status === "archived") conditions.push(eq(subscriptionsTable.isArchived, true));

    if (categoryId) conditions.push(eq(subscriptionsTable.categoryId, parseInt(categoryId)));
    if (billingCycle) conditions.push(eq(subscriptionsTable.billingCycle, billingCycle));
    if (search) conditions.push(or(ilike(subscriptionsTable.name, `%${search}%`), ilike(subscriptionsTable.notes, `%${search}%`))!);
    if (minPrice) conditions.push(gte(subscriptionsTable.price, minPrice));
    if (maxPrice) conditions.push(lte(subscriptionsTable.price, maxPrice));

    let orderBy;
    const dir = sortOrder === "desc" ? desc : asc;
    switch (sortBy) {
      case "name":         orderBy = dir(subscriptionsTable.name); break;
      case "price":        orderBy = dir(subscriptionsTable.price); break;
      case "renewalDate":  orderBy = dir(subscriptionsTable.renewalDate); break;
      case "createdAt":    orderBy = sortOrder === "asc" ? asc(subscriptionsTable.createdAt) : desc(subscriptionsTable.createdAt); break;
      default:             orderBy = desc(subscriptionsTable.createdAt);
    }

    const rows = await db
      .select()
      .from(subscriptionsTable)
      .leftJoin(categoriesTable, eq(subscriptionsTable.categoryId, categoriesTable.id))
      .where(and(...conditions))
      .orderBy(orderBy);

    const enriched = await Promise.all(rows.map(async r => {
      const sub = enrichSub(r.subscriptions, r.categories);
      if (sub.isShared) {
        const sh = await getShares(sub.id);
        sub.shares = sh.map(s => ({ id: s.id, name: s.name, amount: parseFloat(s.amount), isCurrentUser: s.isCurrentUser }));
        const us = sh.find(s => s.isCurrentUser);
        sub.userShareAmount = us ? parseFloat(us.amount) : null;
      } else { sub.shares = []; sub.userShareAmount = null; }
      return sub;
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to list subscriptions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { name, icon, categoryId, price, currency, billingCycle, renewalDate, paymentMethod, notes, isActive, subscriptionType, trialEndsAt, trialConvertsToRecurring, recurringPrice, recurringBillingCycle, purchaseDate, isShared, splitMode, shares } = req.body;

  // Type-specific validation
  if (!name || price === undefined) {
    res.status(400).json({ error: "name and price are required" });
    return;
  }
  const subType = subscriptionType || "recurring";
  if (subType === "recurring") {
    if (!billingCycle) { res.status(400).json({ error: "billingCycle is required for recurring subscriptions" }); return; }
    if (!renewalDate) { res.status(400).json({ error: "renewalDate is required for recurring subscriptions" }); return; }
  } else if (subType === "trial") {
    if (!trialEndsAt) { res.status(400).json({ error: "trialEndsAt is required for trial subscriptions" }); return; }
  } else if (subType === "lifetime") {
    if (!purchaseDate) { res.status(400).json({ error: "purchaseDate is required for lifetime subscriptions" }); return; }
  }

  try {
    // Clean fields per subscription type — server is source of truth
    const isTrial = subType === "trial";
    const isLifetime = subType === "lifetime";
    const isTrialConverts = isTrial && trialConvertsToRecurring;

    // Validate custom split BEFORE insert to prevent orphaned subscriptions
      if (isShared && splitMode === 'custom' && Array.isArray(shares) && shares.length > 0) {
        const totalAmount = shares.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
        const priceNum = parseFloat(price.toString());
        if (Math.abs(totalAmount - priceNum) > 0.01) {
          res.status(400).json({ error: 'Share amounts must add up to the subscription price (' + priceNum + ')' });
          return;
        }
      }

    const [sub] = await db.insert(subscriptionsTable).values({
      clerkId: userId,
      name,
      icon: icon || null,
      categoryId: categoryId || null,
      price: price.toString(),
      currency: currency || "INR",
      // billingCycle is required by DB schema; meaningful only for recurring
      billingCycle: billingCycle || "monthly",
      // renewalDate: only meaningful for recurring
      renewalDate: isTrial || isLifetime ? null : (renewalDate || null),
      paymentMethod: paymentMethod || null,
      notes: notes || null,
      isActive: isActive !== false,
      isArchived: false,
      subscriptionType: subType,
      // Trial fields: only meaningful for trials
      trialEndsAt: isTrial ? (trialEndsAt || null) : null,
      trialConvertsToRecurring: isTrial ? (trialConvertsToRecurring ?? false) : null,
      // Recurring-after-trial: only when trial converts
      recurringPrice: isTrialConverts && recurringPrice != null ? recurringPrice.toString() : null,
      recurringBillingCycle: isTrialConverts ? (recurringBillingCycle || null) : null,
      // Lifetime
      purchaseDate: isLifetime ? (purchaseDate || null) : null,
      // Cost Sharing
      isShared: isShared || false,
      splitMode: splitMode || "equal",
    }).returning();

    const category = categoryId
      ? await db.query.categoriesTable.findFirst({ where: eq(categoriesTable.id, categoryId) })
      : null;

    const subData = enrichSub(sub, category);
    if (isShared && Array.isArray(shares) && shares.length > 0) {
      await upsertShares(sub.id, shares);
      // Defensive: ensure is_shared=true in DB even if the INSERT missed it
      if (!sub.isShared) {
        await db.update(subscriptionsTable).set({ isShared: true }).where(eq(subscriptionsTable.id, sub.id));
      }
      const saved = await getShares(sub.id);
      subData.shares = saved.map(s => ({ id: s.id, name: s.name, amount: parseFloat(s.amount), isCurrentUser: s.isCurrentUser }));
      const us = saved.find(s => s.isCurrentUser);
      subData.userShareAmount = us ? parseFloat(us.amount) : null;
    } else { subData.shares = []; subData.userShareAmount = null; }
    res.status(201).json(subData);
  } catch (err) {
    req.log.error({ err }, "Failed to create subscription");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params["id"] as string);
  try {
    const [row] = await db
      .select()
      .from(subscriptionsTable)
      .leftJoin(categoriesTable, eq(subscriptionsTable.categoryId, categoriesTable.id))
      .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.clerkId, userId)));

    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    const subData = enrichSub(row.subscriptions, row.categories);
    const shares = await getShares(subData.id);
    subData.shares = shares.map(s => ({ id: s.id, name: s.name, amount: parseFloat(s.amount), isCurrentUser: s.isCurrentUser }));
    const us = shares.find(s => s.isCurrentUser);
    subData.userShareAmount = us ? parseFloat(us.amount) : null;
    res.json(subData);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params["id"] as string);
  const { name, icon, categoryId, price, currency, billingCycle, renewalDate, paymentMethod, notes, isActive, subscriptionType: subTypeUpdate, trialEndsAt, trialConvertsToRecurring, recurringPrice, recurringBillingCycle, purchaseDate, isShared, splitMode, shares } = req.body;

  try {
    const updates: Record<string, any> = {};
    if (name !== undefined)          updates.name = name;
    if (icon !== undefined)          updates.icon = icon;
    if (categoryId !== undefined)    updates.categoryId = categoryId;
    if (price !== undefined)         updates.price = price.toString();
    if (currency !== undefined)      updates.currency = currency;
    if (billingCycle !== undefined)  updates.billingCycle = billingCycle;
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
    if (notes !== undefined)         updates.notes = notes;
    if (isActive !== undefined)      updates.isActive = isActive;
    // Determine the effective subscription type (use update value or fall back to existing)
    const effectiveType = subTypeUpdate || "recurring";
    const patchIsTrial = effectiveType === "trial";
    const patchIsLifetime = effectiveType === "lifetime";
    const patchTrialConverts = patchIsTrial && trialConvertsToRecurring;

    // Type-specific validation for PATCH
    if (subTypeUpdate !== undefined) {
      if (effectiveType === 'recurring') {
        if (billingCycle !== undefined && !billingCycle) {
          res.status(400).json({ error: 'billingCycle is required for recurring subscriptions' }); return;
        }
        if (renewalDate !== undefined && !renewalDate && !updates.renewalDate) {
          // Only reject if explicitly setting renewalDate to empty without providing a value
        }
      } else if (effectiveType === 'trial') {
        if (trialEndsAt !== undefined && !trialEndsAt) {
          res.status(400).json({ error: 'trialEndsAt is required for trial subscriptions' }); return;
        }
      } else if (effectiveType === 'lifetime') {
        if (purchaseDate !== undefined && !purchaseDate) {
          res.status(400).json({ error: 'purchaseDate is required for lifetime subscriptions' }); return;
        }
      }
    }

    if (subTypeUpdate !== undefined)    updates.subscriptionType = subTypeUpdate;
    if (isShared !== undefined)        updates.isShared = isShared;
    if (splitMode !== undefined)       updates.splitMode = splitMode;
    // renewalDate: only meaningful for recurring
    if (renewalDate !== undefined)      updates.renewalDate = (patchIsTrial || patchIsLifetime) ? null : (renewalDate || null);
    // Trial fields
    if (trialEndsAt !== undefined)      updates.trialEndsAt = patchIsTrial ? (trialEndsAt || null) : null;
    if (trialConvertsToRecurring !== undefined) updates.trialConvertsToRecurring = patchIsTrial ? (trialConvertsToRecurring ?? false) : null;
    // Recurring-after-trial
    if (recurringPrice !== undefined)   updates.recurringPrice = patchTrialConverts && recurringPrice != null ? recurringPrice.toString() : null;
    if (recurringBillingCycle !== undefined) updates.recurringBillingCycle = patchTrialConverts ? (recurringBillingCycle || null) : null;
    // Lifetime
    if (purchaseDate !== undefined)     updates.purchaseDate = patchIsLifetime ? (purchaseDate || null) : null;


    // When subscription type changes, clear stale fields from the previous type
    if (subTypeUpdate !== undefined) {
      if (effectiveType === 'recurring') {
        // Clear trial fields
        if (trialEndsAt === undefined) updates.trialEndsAt = null;
        if (trialConvertsToRecurring === undefined) updates.trialConvertsToRecurring = null;
        if (recurringPrice === undefined) updates.recurringPrice = null;
        if (recurringBillingCycle === undefined) updates.recurringBillingCycle = null;
        if (purchaseDate === undefined) updates.purchaseDate = null;
        // Keep renewalDate and billingCycle as they may be provided
      } else if (effectiveType === 'trial') {
        // Clear recurring renewal fields, keep trial fields
        if (renewalDate === undefined) updates.renewalDate = null;
        if (purchaseDate === undefined) updates.purchaseDate = null;
      } else if (effectiveType === 'lifetime') {
        // Clear recurring + trial fields
        if (renewalDate === undefined) updates.renewalDate = null;
        if (trialEndsAt === undefined) updates.trialEndsAt = null;
        if (trialConvertsToRecurring === undefined) updates.trialConvertsToRecurring = null;
        if (recurringPrice === undefined) updates.recurringPrice = null;
        if (recurringBillingCycle === undefined) updates.recurringBillingCycle = null;
      }
    }

    const [updated] = await db
      .update(subscriptionsTable)
      .set(updates)
      .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.clerkId, userId)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Not found" }); return; }

    const category = updated.categoryId
      ? await db.query.categoriesTable.findFirst({ where: eq(categoriesTable.id, updated.categoryId) })
      : null;

    const subData = enrichSub(updated, category);
    if (isShared !== undefined) {
      if (isShared && splitMode === 'custom' && Array.isArray(shares) && shares.length > 0) {
        const totalAmount = shares.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
        const priceStr = updates.price || updated.price;
        const priceNum = parseFloat(priceStr.toString());
        if (Math.abs(totalAmount - priceNum) > 0.01) {
          res.status(400).json({ error: 'Share amounts must add up to the subscription price (' + priceNum + ')' });
          return;
        }
      }
      if (isShared && Array.isArray(shares) && shares.length > 0) {
        await upsertShares(updated.id, shares);
        // Defensive: ensure is_shared=true in DB
        if (!updated.isShared) {
          await db.update(subscriptionsTable).set({ isShared: true }).where(eq(subscriptionsTable.id, updated.id));
        }
        const saved = await getShares(updated.id);
        subData.shares = saved.map(s => ({ id: s.id, name: s.name, amount: parseFloat(s.amount), isCurrentUser: s.isCurrentUser }));
        const us = saved.find(s => s.isCurrentUser);
        subData.userShareAmount = us ? parseFloat(us.amount) : null;
      } else if (!isShared) {
        await deleteShares(updated.id);
        subData.shares = []; subData.userShareAmount = null;
      } else { subData.shares = []; subData.userShareAmount = null; }
    } else {
      const existing = await getShares(updated.id);
      subData.shares = existing.map(s => ({ id: s.id, name: s.name, amount: parseFloat(s.amount), isCurrentUser: s.isCurrentUser }));
      const us = existing.find(s => s.isCurrentUser);
      subData.userShareAmount = us ? parseFloat(us.amount) : null;
    }
    res.json(subData);
  } catch (err) {
    req.log.error({ err }, "Failed to update subscription");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params["id"] as string);
  try {
    await db.delete(subscriptionsTable).where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.clerkId, userId)));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/archive", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params["id"] as string);
  try {
    const [updated] = await db
      .update(subscriptionsTable)
      .set({ isArchived: true, isActive: false })
      .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.clerkId, userId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(enrichSub(updated, null));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/restore", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params["id"] as string);
  try {
    const [updated] = await db
      .update(subscriptionsTable)
      .set({ isArchived: false, isActive: true })
      .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.clerkId, userId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(enrichSub(updated, null));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
