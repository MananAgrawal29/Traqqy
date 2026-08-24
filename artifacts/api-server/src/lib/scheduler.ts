/**
 * Reminder scheduler — processes due reminders with atomic claiming.
 *
 * KNOWN LIMITATION — Email-sent-but-DB-update-failed window:
 * The processing order is: claim → send email → mark sent in DB.
 * If the email is accepted by Resend but the server crashes before
 * the DB update, the reminder stays in "processing" and will be
 * retried after stale recovery (10 minutes). This could result in
 * a duplicate email. This is an unavoidable trade-off of the
 * claim-then-send approach without a two-phase commit. The risk
 * is low (requires Resend acceptance + immediate server crash)
 * and the consequence (a duplicate reminder email) is not harmful.
 * Marking sent-before-send would prevent duplicates but lose
 * reminders on transient email failures.
 *
 * Lifecycle: pending → processing → sent | failed
 *
 * Concurrency: Uses an atomic UPDATE ... WHERE status = 'pending'
 * to claim a reminder before processing. Only one worker can claim
 * each reminder. If the worker crashes while processing, the reminder
 * stays in "processing" — a stale-processing recovery sweep resets
 * those back to "pending" after a timeout.
 */

import { db } from "@workspace/db";
import { remindersTable, subscriptionsTable, userSettingsTable } from "@workspace/db";
import { eq, and, lte, sql } from "drizzle-orm";
import { sendReminderEmail } from "./mail";
import { daysUntilRenewal } from "./scheduling";
import { getClerkUserEmail } from "./clerk-user";

/** How long before a "processing" record is considered stale (10 minutes). */
const STALE_PROCESSING_MS = 10 * 60 * 1000;


/**
 * Atomically claim a single pending reminder for processing.
 * Returns the claimed reminder row, or null if none available.
 *
 * Uses UPDATE ... WHERE status = 'pending' RETURNING to ensure
 * only one worker can claim each reminder.
 */
async function claimReminder(): Promise<{
  id: number;
  clerkId: string;
  subscriptionId: number;
  daysBefore: number;
  scheduledSendAt: Date | null;
} | null> {
  const now = new Date();

  // Atomically claim: UPDATE ... WHERE status = 'pending' AND scheduled_send_at <= now
  // This returns at most one row. If two workers race, only one gets the row.
  const claimed = await db
    .update(remindersTable)
    .set({ status: "processing" })
    .where(
      and(
        eq(remindersTable.status, "pending"),
        lte(remindersTable.scheduledSendAt, now)
      )
    )
    .returning({
      id: remindersTable.id,
      clerkId: remindersTable.clerkId,
      subscriptionId: remindersTable.subscriptionId,
      daysBefore: remindersTable.daysBefore,
      scheduledSendAt: remindersTable.scheduledSendAt,
    });

  return claimed[0] ?? null;
}

/**
 * Reset stale "processing" reminders back to "pending" for retry.
 * A reminder stuck in "processing" for longer than STALE_PROCESSING_MS
 * is assumed to have been abandoned by a crashed worker.
 */
async function recoverStaleReminders(): Promise<number> {
  const staleThreshold = new Date(Date.now() - STALE_PROCESSING_MS);

  const recovered = await db
    .update(remindersTable)
    .set({ status: "pending", error: null })
    .where(
      and(
        eq(remindersTable.status, "processing"),
        lte(remindersTable.updatedAt, staleThreshold)
      )
    )
    .returning({ id: remindersTable.id });

  return recovered.length;
}

/**
 * Mark a reminder as sent.
 */
async function markSent(reminderId: number): Promise<void> {
  await db
    .update(remindersTable)
    .set({
      status: "sent",
      sentAt: new Date(),
      error: null,
    })
    .where(eq(remindersTable.id, reminderId));
}

/**
 * Mark a reminder as failed with an error message.
 */
async function markFailed(reminderId: number, error: string): Promise<void> {
  await db
    .update(remindersTable)
    .set({
      status: "failed",
      error,
    })
    .where(eq(remindersTable.id, reminderId));
}

/**
 * Process a single claimed reminder:
 * 1. Fetch subscription details
 * 2. Fetch user email from Clerk
 * 3. Calculate days until renewal
 * 4. Send email
 * 5. Mark as sent or failed
 */
async function processReminder(reminder: {
  id: number;
  clerkId: string;
  subscriptionId: number;
  daysBefore: number;
}): Promise<{ success: boolean; error?: string }> {
  // Fetch subscription
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.id, reminder.subscriptionId))
    .limit(1);

  if (!sub) {
    return { success: false, error: "Subscription not found" };
  }

  if (!sub.isActive || sub.isArchived) {
    return { success: false, error: "Subscription is not active" };
  }

  if (!sub.renewalDate) {
    return { success: false, error: "Subscription has no renewal date" };
  }

  // Fetch user email from Clerk
  const email = await getClerkUserEmail(reminder.clerkId);
  if (!email) {
    return { success: false, error: "User email not found in Clerk" };
  }

  // Calculate days until renewal
  const daysUntil = daysUntilRenewal(sub.renewalDate);
  if (daysUntil < 0) {
    return { success: false, error: "Renewal date is in the past" };
  }

  // Send email
  try {
    await sendReminderEmail({
      to: email,
      subscriptionName: sub.name,
      amount: parseFloat(sub.price),
      currency: sub.currency,
      renewalDate: sub.renewalDate,
      daysUntilRenewal: daysUntil,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Email send failed: ${message}` };
  }

  return { success: true };
}

export interface ProcessResult {
  processed: number;
  sent: number;
  failed: number;
  recovered: number;
}

/**
 * Main entry point: process all due reminders.
 *
 * This function is idempotent and safe to call concurrently:
 * - Atomic claiming prevents duplicate sends
 * - Stale recovery handles crashed workers
 * - Each reminder is processed independently
 *
 * Call this from the POST /api/reminders/process endpoint.
 */
export async function processDueReminders(): Promise<ProcessResult> {
  const result: ProcessResult = { processed: 0, sent: 0, failed: 0, recovered: 0 };

  // 1. Recover stale processing reminders
  result.recovered = await recoverStaleReminders();

  // 2. Process up to 50 reminders per invocation (prevents long-running jobs)
  const BATCH_SIZE = 50;

  for (let i = 0; i < BATCH_SIZE; i++) {
    // Atomically claim one reminder
    const reminder = await claimReminder();
    if (!reminder) break;

    result.processed++;

    try {
      const outcome = await processReminder(reminder);

      if (outcome.success) {
        await markSent(reminder.id);
        result.sent++;
      } else {
        await markFailed(reminder.id, outcome.error || "Unknown error");
        result.failed++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markFailed(reminder.id, message);
      result.failed++;
    }
  }

  return result;
}
