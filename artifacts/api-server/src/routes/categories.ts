import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, subscriptionsTable } from "@workspace/db";
import { eq, and, or, isNull, count } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";

const router = Router();

// Default categories seeded once per server startup
const DEFAULT_CATEGORIES = [
  { name: "Entertainment",  color: "#f43f5e", icon: "Tv",           isDefault: true },
  { name: "Productivity",   color: "#6366f1", icon: "Briefcase",    isDefault: true },
  { name: "AI",             color: "#8b5cf6", icon: "Bot",          isDefault: true },
  { name: "Education",      color: "#0ea5e9", icon: "GraduationCap",isDefault: true },
  { name: "Gaming",         color: "#10b981", icon: "Gamepad2",     isDefault: true },
  { name: "Music",          color: "#f59e0b", icon: "Music",        isDefault: true },
  { name: "Cloud Storage",  color: "#3b82f6", icon: "Cloud",        isDefault: true },
  { name: "Utilities",      color: "#64748b", icon: "Wrench",       isDefault: true },
  { name: "Finance",        color: "#22c55e", icon: "DollarSign",   isDefault: true },
  { name: "Health",         color: "#ec4899", icon: "Heart",        isDefault: true },
  { name: "Development",    color: "#06b6d4", icon: "Code2",        isDefault: true },
  { name: "Shopping",       color: "#f97316", icon: "ShoppingBag",  isDefault: true },
  { name: "Communication",  color: "#84cc16", icon: "MessageSquare",isDefault: true },
  { name: "Design",         color: "#e879f9", icon: "Palette",      isDefault: true },
  { name: "Business",       color: "#2563eb", icon: "BarChart3",    isDefault: true },
  { name: "Security",       color: "#14b8a6", icon: "Shield",       isDefault: true },
  { name: "Travel",         color: "#78716c", icon: "Plane",        isDefault: true },
  { name: "News",           color: "#71717a", icon: "Newspaper",    isDefault: true },
  { name: "Lifestyle",      color: "#d97706", icon: "Sparkles",     isDefault: true },
];

export async function seedDefaultCategories() {
  const existing = await db
    .select({ name: categoriesTable.name })
    .from(categoriesTable)
    .where(eq(categoriesTable.isDefault, true));
  const existingNames = new Set(existing.map(c => c.name));
  const toInsert = DEFAULT_CATEGORIES.filter(c => !existingNames.has(c.name));
  if (toInsert.length > 0) {
    await db.insert(categoriesTable).values(toInsert);
  }
}

router.get("/", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const cats = await db
      .select()
      .from(categoriesTable)
      .where(or(eq(categoriesTable.isDefault, true), eq(categoriesTable.clerkId, userId))!);

    // Count subscriptions per category for the current user
    const subCounts = await db
      .select({ categoryId: subscriptionsTable.categoryId, cnt: count() })
      .from(subscriptionsTable)
      .where(and(eq(subscriptionsTable.clerkId, userId), eq(subscriptionsTable.isArchived, false)))
      .groupBy(subscriptionsTable.categoryId);

    const countMap = new Map(subCounts.map(s => [s.categoryId, Number(s.cnt)]));

    res.json(cats.map(c => ({
      ...c,
      subscriptionCount: countMap.get(c.id) ?? 0,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list categories");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { name, color, icon } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  try {
    const [cat] = await db.insert(categoriesTable).values({
      name,
      color: color || "#6366f1",
      icon: icon || "Tag",
      isDefault: false,
      clerkId: userId,
    }).returning();
    res.status(201).json({ ...cat, subscriptionCount: 0 });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params["id"] as string);
  const { name, color, icon } = req.body;
  try {
    const [updated] = await db
      .update(categoriesTable)
      .set({ ...(name && { name }), ...(color && { color }), ...(icon && { icon }) })
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.clerkId, userId), eq(categoriesTable.isDefault, false)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...updated, subscriptionCount: 0 });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params["id"] as string);
  try {
    await db
      .delete(categoriesTable)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.clerkId, userId), eq(categoriesTable.isDefault, false)));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
