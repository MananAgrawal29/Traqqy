/**
 * Classify whether an extracted email represents a subscription.
 * This uses rule-based scoring to avoid false positives.
 */

import type { ExtractedEmail } from "./extract";
import { NON_SUBSCRIPTION_MERCHANTS, ONE_TIME_KEYWORDS, SUBSCRIPTION_KEYWORDS, PLATFORM_NAMES } from "./payment-providers";

export interface ClassificationResult {
  score: number;
  label: "subscription" | "one-time" | "uncertain";
  reasons: string[];
}

/**
 * Subscription signals that are meaningful in email snippets/bodies.
 * For payment-provider emails, the snippet (body) is where subscription
 * context typically lives — not the subject.
 */
const SNIPPET_SUBSCRIPTION_SIGNALS = [
  "subscription",
  "renewal",
  "renewed",
  "auto-renew",
  "monthly",
  "annual",
  "yearly",
  "plan",
  "premium",
  "membership",
  "recurring",
  "trial",
  "billed",
];

/**
 * Score an extracted email for subscription likelihood.
 * Higher score = more likely a subscription.
 * Negative score = likely NOT a subscription.
 */
export function classifyEmail(email: ExtractedEmail): ClassificationResult {
  let score = 0;
  const reasons: string[] = [];
  const lowerSubject = email.subject.toLowerCase();
  const lowerSnippet = email.snippet.toLowerCase();
  const lowerCombined = `${lowerSubject} ${lowerSnippet}`;
  const lowerMerchant = (email.merchantGuess || "").toLowerCase();

  // ── Negative signals (one-time / non-subscription) ──

  // Check non-subscription merchant list
  if (lowerMerchant && NON_SUBSCRIPTION_MERCHANTS.has(lowerMerchant)) {
    score -= 5;
    reasons.push(`Known non-subscription merchant: ${email.merchantGuess}`);
  }

  // Check for non-subscription keywords in subject
  for (const keyword of ONE_TIME_KEYWORDS) {
    if (lowerSubject.includes(keyword)) {
      score -= 3;
      reasons.push(`One-time keyword in subject: "${keyword}"`);
      break; // Don't double-count
    }
  }

  // Refund/cancellation/failure are strong negative signals
  if (/refund|cancelled|canceled|failed|failed payment/i.test(lowerSubject)) {
    score -= 5;
    reasons.push("Refund, cancellation, or failure detected");
  }

  // One-time purchase indicators for Google Play
  const gpOneTimeSignals = ["one-time", "single purchase", "app purchase", "game purchase"];
  if (lowerCombined.includes("google play")) {
    for (const signal of gpOneTimeSignals) {
      if (lowerCombined.includes(signal)) {
        score -= 4;
        reasons.push(`Google Play one-time purchase signal: "${signal}"`);
      }
    }
  }

  // ── Positive signals (subscription) ──

  // Subscription keywords in subject
  let subKeywordCount = 0;
  for (const keyword of SUBSCRIPTION_KEYWORDS) {
    if (lowerSubject.includes(keyword)) {
      subKeywordCount++;
    }
  }
  if (subKeywordCount >= 3) {
    score += 4;
    reasons.push(`Strong subscription language in subject (${subKeywordCount} keywords)`);
  } else if (subKeywordCount >= 2) {
    score += 3;
    reasons.push(`Multiple subscription keywords in subject (${subKeywordCount})`);
  } else if (subKeywordCount === 1) {
    // Single keyword (e.g., just "premium") is weak evidence alone
    score += 1;
    reasons.push(`Weak subscription keyword in subject`);
  }

  // Subscription keywords in snippet
  // Require 3+ keywords because snippets from bank emails often contain
  // incidental words like "plan" or "billing" in non-subscription context
  let snippetSubCount = 0;
  for (const keyword of SUBSCRIPTION_KEYWORDS) {
    if (lowerSnippet.includes(keyword)) {
      snippetSubCount++;
    }
  }
  if (snippetSubCount >= 3) {
    score += 2;
    reasons.push(`Strong subscription language in email snippet (${snippetSubCount} keywords)`);
  }

  // For payment provider emails: check for subscription signals in snippet/body
  // The subject of payment-provider emails is usually generic ("Order", "Receipt")
  // but the body names the actual service and subscription context.
  if (email.isPaymentProvider) {
    let snippetSignals = 0;
    for (const signal of SNIPPET_SUBSCRIPTION_SIGNALS) {
      if (lowerSnippet.includes(signal)) {
        snippetSignals++;
      }
    }
    if (snippetSignals >= 3) {
      score += 4;
      reasons.push(`Strong subscription signals in payment-provider email (${snippetSignals} keywords)`);
    } else if (snippetSignals >= 2) {
      score += 2;
      reasons.push(`Moderate subscription signals in payment-provider email snippet`);
    }
  }

  // Platform name detected but no underlying merchant — reduce confidence
  // (e.g., "Google Play" without a product name = uncertain)
  if (email.merchantGuess && PLATFORM_NAMES.has(lowerMerchant)) {
    score -= 2;
    reasons.push(`Platform name detected as merchant: ${email.merchantGuess} (underlying product unknown)`);
  }

  // NOTE: Amount and roundish-number bonuses are intentionally omitted.
  // Amounts appear in ALL transactions (subscriptions, groceries, fuel, etc.)
  // and are not meaningful subscription evidence on their own.

  return {
    score,
    label: score >= 2 ? "subscription" : score <= -2 ? "one-time" : "uncertain",
    reasons,
  };
}
