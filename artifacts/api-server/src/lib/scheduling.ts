import { db } from "@workspace/db";
import { remindersTable, userSettingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

/**
 * Calculate the scheduledSendAt timestamp for a reminder.
 *
 * Logic: renewalDate - daysBefore, at 09:00 in the user's configured timezone.
 * If no timezone is configured, defaults to UTC.
 *
 * The calculation uses Intl.DateTimeFormat to determine the UTC offset for the
 * target timezone on the specific reminder date, then adjusts accordingly.
 * This correctly handles DST transitions because the offset is computed for
 * the actual date, not a fixed offset.
 */
export async function calculateScheduledSendAt(
  clerkId: string,
  renewalDate: string, // YYYY-MM-DD
  daysBefore: number
): Promise<Date | null> {
  // Get user timezone
  const settings = await db.query.userSettingsTable.findFirst({
    where: eq(userSettingsTable.clerkId, clerkId),
  });
  const timezone = settings?.timezone || "UTC";

  // Calculate the reminder date: renewalDate - daysBefore (all in UTC)
  const renewal = new Date(renewalDate + "T00:00:00Z");
  const reminderDate = new Date(renewal);
  reminderDate.setUTCDate(reminderDate.getUTCDate() - daysBefore);

  // Extract the YYYY-MM-DD string (always UTC, no timezone influence)
  const dateStr = reminderDate.toISOString().split("T")[0]!;

  try {
    // Construct 09:00 UTC on the reminder date
    const utcDate = new Date(dateStr + "T09:00:00Z");

    // Use Intl to find what 09:00 UTC represents in the target timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const tzParts = formatter.formatToParts(utcDate);
    const tzHour = parseInt(tzParts.find((p) => p.type === "hour")?.value || "0");
    const tzMinute = parseInt(tzParts.find((p) => p.type === "minute")?.value || "0");

    // Calculate the offset: if UTC 09:00 shows as 14:30 in the timezone,
    // the timezone is +5:30 ahead of UTC. We need to subtract this offset
    // from 09:00 UTC to get 09:00 in the target timezone.
    const offsetMinutes = tzHour * 60 + tzMinute - 9 * 60;
    const scheduledMs = utcDate.getTime() - offsetMinutes * 60 * 1000;
    return new Date(scheduledMs);
  } catch {
    // Fallback: schedule at 09:00 UTC
    return new Date(dateStr + "T09:00:00Z");
  }
}

/**
 * Calculate the number of calendar days from today until the renewal date.
 *
 * Uses UTC-only arithmetic to avoid timezone-related off-by-one errors.
 * The renewalDate is a YYYY-MM-DD string (date column, mode: "string").
 *
 * Returns 0 if the renewal is today, positive if in the future,
 * negative if in the past.
 */
export function daysUntilRenewal(renewalDateStr: string): number {
  // Get today's date in UTC
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Parse renewal date as UTC midnight (not local midnight)
  const renewal = new Date(renewalDateStr + "T00:00:00Z");

  // Calculate difference in whole days
  const diffMs = renewal.getTime() - todayUtc.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Recalculate scheduledSendAt for all pending reminders of a subscription.
 *
 * Called when a subscription's renewalDate changes.
 * Only affects reminders with status = 'pending' or 'failed'.
 * Cancelled and sent reminders are not modified.
 */
export async function recalculateRemindersForSubscription(
  subscriptionId: number,
  clerkId: string,
  newRenewalDate: string
): Promise<number> {
  // Find all pending/failed reminders for this subscription
  const reminders = await db
    .select()
    .from(remindersTable)
    .where(
      and(
        eq(remindersTable.subscriptionId, subscriptionId),
        eq(remindersTable.clerkId, clerkId)
      )
    );

  let updated = 0;

  for (const reminder of reminders) {
    // Only recalculate pending or failed reminders
    if (reminder.status !== "pending" && reminder.status !== "failed") {
      continue;
    }

    const newScheduledSendAt = await calculateScheduledSendAt(
      clerkId,
      newRenewalDate,
      reminder.daysBefore
    );

    await db
      .update(remindersTable)
      .set({
        scheduledSendAt: newScheduledSendAt,
        // If it was failed, reset to pending with the new schedule
        ...(reminder.status === "failed" ? { status: "pending", error: null } : {}),
      })
      .where(eq(remindersTable.id, reminder.id));

    updated++;
  }

  return updated;
}
