import { Router } from "express";
import { db } from "@workspace/db";
import { userSettingsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";

const router = Router();

async function getOrCreateSettings(clerkId: string) {
  // Ensure user row exists
  const existingUser = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!existingUser) {
    await db.insert(usersTable).values({ clerkId }).onConflictDoNothing();
  }

  let settings = await db.query.userSettingsTable.findFirst({ where: eq(userSettingsTable.clerkId, clerkId) });
  if (!settings) {
    const [created] = await db.insert(userSettingsTable).values({ clerkId }).returning();
    settings = created;
  }
  return settings;
}

router.get("/", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const settings = await getOrCreateSettings(userId);
    res.json({ ...settings, userId: settings.clerkId });
  } catch (err) {
    req.log.error({ err }, "Failed to get settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { displayName, currency, theme, timezone } = req.body;
  try {
    await getOrCreateSettings(userId);
    const updates: Record<string, any> = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (currency !== undefined)    updates.currency = currency;
    if (theme !== undefined)       updates.theme = theme;
    if (timezone !== undefined)    updates.timezone = timezone;

    const [updated] = await db
      .update(userSettingsTable)
      .set(updates)
      .where(eq(userSettingsTable.clerkId, userId))
      .returning();
    res.json({ ...updated, userId: updated.clerkId });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/account", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    // Cascade will handle settings, subscriptions (via clerkId on related tables)
    await db.delete(usersTable).where(eq(usersTable.clerkId, userId));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
