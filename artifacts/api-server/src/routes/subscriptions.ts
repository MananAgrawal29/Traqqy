import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable, categoriesTable } from "@workspace/db";
import { eq, and, ilike, gte, lte, or, asc, desc } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";
import { recalculateRemindersForSubscription } from "../lib/scheduling";
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

    const result = rows.map(r => enrichSub(r.subscriptions, r.categories));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list subscriptions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { name, icon, categoryId, price, currency, billingCycle, renewalDate, paymentMethod, notes, isActive } = req.body;

  if (!name || price === undefined || !billingCycle || !renewalDate) {
    res.status(400).json({ error: "name, price, billingCycle, and renewalDate are required" });
    return;
  }

  try {
    const [sub] = await db.insert(subscriptionsTable).values({
      clerkId: userId,
      name,
      icon: icon || null,
      categoryId: categoryId || null,
      price: price.toString(),
      currency: currency || "INR",
      billingCycle,
      renewalDate,
      paymentMethod: paymentMethod || null,
      notes: notes || null,
      isActive: isActive !== false,
      isArchived: false,
    }).returning();

    const category = categoryId
      ? await db.query.categoriesTable.findFirst({ where: eq(categoriesTable.id, categoryId) })
      : null;

    res.status(201).json(enrichSub(sub, category));
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
    res.json(enrichSub(row.subscriptions, row.categories));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params["id"] as string);
  const { name, icon, categoryId, price, currency, billingCycle, renewalDate, paymentMethod, notes, isActive } = req.body;

  try {
    const updates: Record<string, any> = {};
    if (name !== undefined)          updates.name = name;
    if (icon !== undefined)          updates.icon = icon;
    if (categoryId !== undefined)    updates.categoryId = categoryId;
    if (price !== undefined)         updates.price = price.toString();
    if (currency !== undefined)      updates.currency = currency;
    if (billingCycle !== undefined)  updates.billingCycle = billingCycle;
    if (renewalDate !== undefined)   updates.renewalDate = renewalDate;
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
    if (notes !== undefined)         updates.notes = notes;
    if (isActive !== undefined)      updates.isActive = isActive;

    const [updated] = await db
      .update(subscriptionsTable)
      .set(updates)
      .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.clerkId, userId)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Not found" }); return; }

    const category = updated.categoryId
      ? await db.query.categoriesTable.findFirst({ where: eq(categoriesTable.id, updated.categoryId) })
      : null;

    res.json(enrichSub(updated, category));
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
