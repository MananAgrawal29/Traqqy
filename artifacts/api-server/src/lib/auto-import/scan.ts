/**
 * Main scan orchestrator: fetches emails, extracts data, classifies, and scores candidates.
 */

import { db } from "@workspace/db";
import {
  autoImportScansTable,
  autoImportCandidatesTable,
  subscriptionsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getGmailClient, searchMessages, getMessageHeaders, buildSearchQueries } from "./gmail";
import { extractEmailData, type ExtractedEmail } from "./extract";
import { classifyEmail } from "./classify";
import { detectRecurrence } from "./recurrence";
import { matchCatalog } from "./catalog-match";
import { scoreCandidate, type ScoredCandidate } from "./score";
import { MARKETING_PLATFORMS, PLATFORM_NAMES, PAYMENT_PROVIDER_DOMAINS } from "./payment-providers";

/**
 * Run a full auto-import scan for a user.
 * This is called as a background task after the scan is started.
 */
export async function runScan(clerkId: string, scanId: number, monthsBack: number): Promise<void> {
  const updateScan = async (updates: Record<string, unknown>) => {
    await db
      .update(autoImportScansTable)
      .set(updates)
      .where(eq(autoImportScansTable.id, scanId));
  };

  try {
    // Get Gmail client
    const gmail = await getGmailClient(clerkId);

    // Phase 1: Search for emails
    await updateScan({ status: "searching" });

    const queries = buildSearchQueries(monthsBack);
    const allMessageIds = new Map<string, { id: string; threadId: string }>();

    for (const query of queries) {
      const messages = await searchMessages(gmail, query, 500);
      for (const msg of messages) {
        if (!allMessageIds.has(msg.id)) {
          allMessageIds.set(msg.id, { id: msg.id, threadId: msg.threadId });
        }
      }
    }

    await updateScan({ emailsFound: allMessageIds.size });

    // Phase 2: Extract data from each email
    await updateScan({ status: "analyzing" });

    const extractedEmails: ExtractedEmail[] = [];
    let processed = 0;

    for (const msg of allMessageIds.values()) {
      try {
        const { headers, snippet } = await getMessageHeaders(gmail, msg.id);

        // Skip marketing platform emails
        const from = headers["From"] || "";
        const senderDomain = from.split("@")[1]?.toLowerCase() || "";
        if (MARKETING_PLATFORMS.has(senderDomain)) {
          processed++;
          continue;
        }

        // Skip emails with no subject
        if (!headers["Subject"]) {
          processed++;
          continue;
        }

        const extracted = extractEmailData({
          messageId: msg.id,
          threadId: msg.threadId,
          headers,
          snippet,
        });

        extractedEmails.push(extracted);
        processed++;

        // Update progress periodically
        if (processed % 20 === 0) {
          await updateScan({ emailsProcessed: processed });
        }

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 50));
      } catch {
        // Skip individual message errors
        processed++;
      }
    }

    await updateScan({ emailsProcessed: processed });

    // Phase 3: Group by merchant and classify
    await updateScan({ status: "scoring" });

    const merchantGroups = new Map<string, ExtractedEmail[]>();

    for (const email of extractedEmails) {
      // Determine the effective merchant name for grouping.
      // Priority:
      //   1. merchantGuess (extracted from email content)
      //   2. senderDomain (only if it's NOT a known payment provider/platform)
      //
      // For payment providers like Google Play, we must NOT group by the
      // provider domain — we group by the underlying product instead.
      let merchant = email.merchantGuess || null;

      if (!merchant || PLATFORM_NAMES.has(merchant.toLowerCase())) {
        // Merchant is unknown or is a platform name ("Google Play", etc.)
        // Try to find the underlying product from the snippet
        if (!merchant) {
          merchant = email.senderDomain;
        }
      }

      // Skip if the merchant is a bare payment provider domain
      // (e.g., "famapp.in" without a specific product)
      if (merchant && PAYMENT_PROVIDER_DOMAINS.has(merchant.toLowerCase().replace(/^www\./, ""))) {
        // This is a payment provider email with no extracted product — skip
        continue;
      }

      if (!merchant) continue;

      // Use normalized merchant name as key
      const key = merchant.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!key) continue;

      const existing = merchantGroups.get(key) || [];
      existing.push(email);
      merchantGroups.set(key, existing);
    }

    // Phase 4: Score each merchant group
    const candidates: ScoredCandidate[] = [];

    // Get existing subscriptions for duplicate detection
    const existingSubs = await db
      .select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.clerkId, clerkId),
          eq(subscriptionsTable.isArchived, false),
        ),
      );

    for (const [key, emails] of merchantGroups) {
      // Skip single emails from payment providers (too ambiguous)
      if (emails.length === 1 && emails[0]!.isPaymentProvider) {
        const email0 = emails[0]!;
        const merchantGuess = email0.merchantGuess;
        const isPlatform = merchantGuess && PLATFORM_NAMES.has(merchantGuess.toLowerCase());

        // Allow a single payment-provider email through if:
        // 1. It has subscription language (subject or snippet), OR
        // 2. A specific merchant was extracted (not a platform name), OR
        // 3. The merchant matches a known subscription service
        const hasCatalogMatch = merchantGuess ? matchCatalog(merchantGuess) !== null : false;

        if (
          email0.hasSubscriptionLanguage ||
          (merchantGuess && !isPlatform) ||
          hasCatalogMatch
        ) {
          // Fall through to scoring
        } else {
          continue; // Ambiguous — no merchant, no subscription language
        }
      }

      // Get the merchant name (use the most common merchantGuess)
      const merchantNames = emails.map((e) => e.merchantGuess).filter(Boolean);
      const merchantName = getMostCommon(merchantNames) || key;

      // If the resolved merchant name is a platform name, skip this group
      // (shouldn't happen after the grouping fix, but defensive check)
      if (PLATFORM_NAMES.has(merchantName.toLowerCase())) {
        continue;
      }

      // Classify
      const classification = classifyEmail(emails[0]!);

      // Detect recurrence
      const transactions = emails
        .filter((e) => e.amount !== null)
        .map((e) => ({
          date: e.date,
          amount: e.amount!,
          merchant: merchantName,
        }));

      const recurrence = detectRecurrence(transactions);

      // Match against catalog
      const catalogMatch = matchCatalog(merchantName);

      // Score
      const scored = scoreCandidate({
        merchantName,
        emails,
        classification,
        recurrence,
        catalogMatch,
      });

      // Only include candidates with minimum confidence
      if (scored.confidence >= 30) {
        // Check for duplicates against existing subscriptions
        const duplicate = findDuplicate(scored, existingSubs);
        if (duplicate) {
          scored.reasons.push(`⚠️ Similar existing subscription: ${duplicate.name} (${duplicate.currency} ${duplicate.price})`);
        }

        candidates.push(scored);
      }
    }

    // Sort by confidence descending
    candidates.sort((a, b) => b.confidence - a.confidence);

    // Store candidates in database
    for (const candidate of candidates) {
      const duplicate = findDuplicate(candidate, existingSubs);

      await db.insert(autoImportCandidatesTable).values({
        scanId,
        clerkId,
        merchantName: candidate.merchantName,
        catalogMatchId: candidate.catalogMatch?.id || null,
        amount: candidate.amount.toString(),
        currency: candidate.currency,
        billingCycle: candidate.billingCycle,
        lastPaymentDate: candidate.lastPaymentDate,
        confidence: candidate.confidence,
        confidenceLabel: candidate.confidenceLabel,
        reasons: candidate.reasons,
        evidenceCount: candidate.evidenceCount,
        duplicateOfSubscriptionId: duplicate?.id || null,
        emailSender: candidate.emailSender,
        emailSubject: candidate.emailSubject,
      });
    }

    // Update scan as complete
    await updateScan({
      status: "complete",
      candidatesFound: candidates.length,
      completedAt: new Date(),
    });
  } catch (err) {
    await updateScan({
      status: "failed",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      completedAt: new Date(),
    });
  }
}

/**
 * Find the most common element in an array.
 */
function getMostCommon<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  const counts = new Map<T, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  let maxCount = 0;
  let maxItem: T | null = null;
  for (const [item, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxItem = item;
    }
  }
  return maxItem;
}

/**
 * Check if a candidate is a duplicate of an existing subscription.
 */
function findDuplicate(
  candidate: ScoredCandidate,
  existingSubs: Array<{ name: string; price: string; currency: string; billingCycle: string; id: number }>,
): { id: number; name: string; currency: string; price: string } | null {
  for (const sub of existingSubs) {
    const nameMatch = fuzzyNameMatch(candidate.merchantName, sub.name);
    const amountMatch =
      candidate.amount > 0 &&
      Math.abs(candidate.amount - parseFloat(sub.price)) / parseFloat(sub.price) < 0.15;
    const currencyMatch = candidate.currency === sub.currency;

    // Strong duplicate: name + amount match
    if (nameMatch && amountMatch && currencyMatch) {
      return { id: sub.id, name: sub.name, currency: sub.currency, price: sub.price };
    }

    // Moderate duplicate: name match only
    if (nameMatch && !amountMatch) {
      return { id: sub.id, name: sub.name, currency: sub.currency, price: sub.price };
    }
  }
  return null;
}

/**
 * Simple fuzzy name matching.
 */
function fuzzyNameMatch(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/['']/g, "")
      .replace(/\b(premium|pro|plus|plan|subscription|membership)\b/gi, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();

  const na = normalize(a);
  const nb = normalize(b);

  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  // Levenshtein distance for short strings
  if (na.length <= 10 || nb.length <= 10) {
    return levenshtein(na, nb) <= 2;
  }

  return levenshtein(na, nb) <= 3;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }
  return dp[m]![n]!;
}
