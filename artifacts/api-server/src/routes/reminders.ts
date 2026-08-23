import { Router } from "express";
import { db } from "@workspace/db";
import { remindersTable, subscriptionsTable, userSettingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";
import { processDueReminders } from "../lib/scheduler";
import { calculateScheduledSendAt } from "../lib/scheduling";

const router = Router();

// List reminders
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

// Create reminder
router.post("/", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { subscriptionId, daysBefore, isEnabled } = req.body;
  if (!subscriptionId || !daysBefore) {
    res.status(400).json({ error: "subscriptionId and daysBefore are required" });
    return;
  }

  try {
    const [sub] = await db
      .select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.id, subscriptionId),
          eq(subscriptionsTable.clerkId, userId)
        )
      )
      .limit(1);

    if (!sub) {
      res.status(404).json({ error: "Subscription not found" });
      return;
    }

    const scheduledSendAt = await calculateScheduledSendAt(userId, sub.renewalDate, daysBefore);

    const [reminder] = await db.insert(remindersTable).values({
      clerkId: userId,
      subscriptionId,
      daysBefore,
      isEnabled: isEnabled !== false,
      scheduledSendAt,
      status: isEnabled !== false ? "pending" : "cancelled",
    }).returning();

    res.status(201).json({ ...reminder, subscriptionName: sub.name });
  } catch (err: any) {
      // Handle unique constraint violation (duplicate reminder)
      if (err?.code === "23505" || err?.message?.includes("unique")) {
        res.status(409).json({ error: "A reminder already exists for this subscription with the same timing" });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Update reminder
router.patch("/:id", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params["id"] as string);
  const { daysBefore, isEnabled } = req.body;

  try {
    const [existing] = await db
      .select()
      .from(remindersTable)
      .where(and(eq(remindersTable.id, id), eq(remindersTable.clerkId, userId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const updates: Record<string, any> = {};

    if (daysBefore !== undefined) {
      updates.daysBefore = daysBefore;
      const [sub] = await db
        .select()
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.id, existing.subscriptionId))
        .limit(1);
      if (sub) {
        updates.scheduledSendAt = await calculateScheduledSendAt(userId, sub.renewalDate, daysBefore);
      }
    }

    if (isEnabled !== undefined) {
      updates.isEnabled = isEnabled;
      if (!isEnabled) {
        updates.status = "cancelled";
        updates.scheduledSendAt = null;
      } else if (existing.status === "cancelled" || existing.status === "failed") {
        const [sub] = await db
          .select()
          .from(subscriptionsTable)
          .where(eq(subscriptionsTable.id, existing.subscriptionId))
          .limit(1);
        if (sub) {
          updates.scheduledSendAt = await calculateScheduledSendAt(
            userId,
            sub.renewalDate,
            daysBefore ?? existing.daysBefore
          );
          updates.status = "pending";
          updates.error = null;
        }
      }
    }

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

// Delete reminder
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

// Process due reminders (called by external cron)
router.post("/process", async (req, res) => {
  const secret = req.headers["x-reminder-secret"];
  const expectedSecret = process.env["REMINDER_PROCESS_SECRET"];

  if (!expectedSecret || secret !== expectedSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const result = await processDueReminders();
    res.json(result);
  } catch (err) {
    req.log?.error?.({ err }, "Reminder processing failed");
    res.status(500).json({ error: "Processing failed" });
  }
});

export default router;
