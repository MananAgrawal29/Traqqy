/**
 * Combine all detection signals into a final confidence score (0-100).
 */

import type { ExtractedEmail } from "./extract";
import type { ClassificationResult } from "./classify";
import type { RecurrenceResult } from "./recurrence";
import type { CatalogMatch } from "./catalog-match";

export interface ScoredCandidate {
  merchantName: string;
  amount: number;
  currency: string;
  billingCycle: string | null;
  lastPaymentDate: string;
  confidence: number;
  confidenceLabel: "high" | "medium" | "low";
  reasons: string[];
  evidenceCount: number;
  catalogMatch: CatalogMatch | null;
  emailSender: string;
  emailSubject: string;
}

/**
 * Score a group of emails about the same merchant.
 */
export function scoreCandidate(params: {
  merchantName: string;
  emails: ExtractedEmail[];
  classification: ClassificationResult;
  recurrence: RecurrenceResult;
  catalogMatch: CatalogMatch | null;
}): ScoredCandidate {
  const { merchantName, emails, classification, recurrence, catalogMatch } = params;

  let score = 0;
  const reasons: string[] = [];

  // ── Payment evidence requirement ──
  // Without at least one email containing a payment amount, the evidence
  // is very weak (promotional emails, newsletters, etc.).
  const emailsWithAmount = emails.filter((e) => e.amount !== null && e.amount > 0);
  const hasPaymentEvidence = emailsWithAmount.length > 0;

  if (!hasPaymentEvidence) {
    // No payment evidence at all — significant penalty
    // This prevents promotional/newsletter emails from becoming candidates
    score -= 15;
    reasons.push("No payment amounts detected in any email (promotional/notification only)");
  }

  // ── Base score from classification (0-30) ──
  if (classification.score >= 4) {
    score += 30;
    reasons.push("Strong subscription signals in email content");
  } else if (classification.score >= 2) {
    score += 20;
    reasons.push("Moderate subscription signals in email content");
  } else if (classification.score >= 0) {
    score += 10;
    reasons.push("Some subscription indicators detected");
  } else {
    score += 0;
    reasons.push("Weak or negative subscription signals");
  }

  // ── Recurrence bonus (0-30) ──
  if (recurrence.confidence === "strong") {
    score += 30;
    reasons.push(`Strong recurrence pattern: ${recurrence.occurrenceCount} payments, ~${recurrence.billingCycle} cycle`);
  } else if (recurrence.confidence === "moderate") {
    score += 20;
    reasons.push(`Moderate recurrence: ${recurrence.occurrenceCount} payments detected`);
  } else if (recurrence.confidence === "weak") {
    score += 5;
    reasons.push("Limited recurrence evidence");
  }

  // ── Catalog match bonus (0-15) ──
  if (catalogMatch) {
    score += 15;
    reasons.push(`Known subscription service: ${catalogMatch.name} (${catalogMatch.category})`);
  }

  // ── Evidence count bonus (0-10) ──
  const evidenceBonus = Math.min(emails.length * 3, 10);
  score += evidenceBonus;
  if (emails.length > 1) {
    reasons.push(`${emails.length} supporting emails found`);
  }

  // ── Subscription language bonus (0-15) ──
  const subLangCount = emails.filter((e) => e.hasSubscriptionLanguage).length;
  if (subLangCount >= 2) {
    score += 15;
    reasons.push("Multiple emails contain subscription-specific language");
  } else if (subLangCount === 1) {
    score += 8;
    reasons.push("Subscription-specific language detected");
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine label
  let confidenceLabel: ScoredCandidate["confidenceLabel"];
  if (score >= 60) {
    confidenceLabel = "high";
  } else if (score >= 35) {
    confidenceLabel = "medium";
  } else {
    confidenceLabel = "low";
  }

  // Get latest payment date
  const sortedDates = emails
    .map((e) => e.date)
    .filter((d) => d)
    .sort()
    .reverse();
  const lastPaymentDate = sortedDates[0] || new Date().toISOString().split("T")[0]!;

  // Get the primary amount (most common or latest)
  const amounts = emails.filter((e) => e.amount !== null).map((e) => e.amount!);
  const amount = amounts.length > 0 ? amounts[amounts.length - 1]! : 0;

  // Get currency (most common)
  const currencies = emails.filter((e) => e.currency !== null).map((e) => e.currency!);
  const currency = currencies.length > 0 ? currencies[currencies.length - 1]! : "USD";

  return {
    merchantName,
    amount,
    currency,
    billingCycle: recurrence.billingCycle,
    lastPaymentDate,
    confidence: score,
    confidenceLabel,
    reasons,
    evidenceCount: emails.length,
    catalogMatch,
    emailSender: emails[0]?.senderEmail || "",
    emailSubject: emails[0]?.subject || "",
  };
}
