import { Router } from "express";
import { db } from "@workspace/db";
import { remindersTable, subscriptionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const rows = await db
      .select()
      .from(remindersTable)
      .leftJoin(subscriptionsTable, eq(remindersTable.subscriptionId, subscriptionsTable.id))
      .where(eq(remindersTable.clerkId, userId));

    res.json(rows.map(r => ({
      ...r.reminders,
      subscriptionName: r.subscriptions?.name ?? null,
    })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { subscriptionId, daysBefore, isEnabled } = req.body;
  if (!subscriptionId || !daysBefore) {
    res.status(400).json({ error: "subscriptionId and daysBefore are required" });
    return;
  }
  try {
    const [reminder] = await db.insert(remindersTable).values({
      clerkId: userId,
      subscriptionId,
      daysBefore,
      isEnabled: isEnabled !== false,
    }).returning();
    res.status(201).json({ ...reminder, subscriptionName: null });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params["id"] as string);
  const { daysBefore, isEnabled } = req.body;
  try {
    const updates: Record<string, any> = {};
    if (daysBefore !== undefined) updates.daysBefore = daysBefore;
    if (isEnabled !== undefined)  updates.isEnabled = isEnabled;

    const [updated] = await db
      .update(remindersTable)
      .set(updates)
      .where(and(eq(remindersTable.id, id), eq(remindersTable.clerkId, userId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...updated, subscriptionName: null });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params["id"] as string);
  try {
    await db.delete(remindersTable).where(and(eq(remindersTable.id, id), eq(remindersTable.clerkId, userId)));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
