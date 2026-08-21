/**
 * Detect recurring payment patterns across multiple emails to the same merchant.
 */

export interface RecurrenceResult {
  hasRecurrence: boolean;
  billingCycle: string | null; // weekly | monthly | quarterly | semi_annual | yearly | null
  occurrenceCount: number;
  averageIntervalDays: number | null;
  confidence: "strong" | "moderate" | "weak" | "none";
  reasons: string[];
}

interface Transaction {
  date: string; // YYYY-MM-DD
  amount: number;
  merchant: string;
}

const CYCLE_RANGES: Record<string, { min: number; max: number }> = {
  weekly: { min: 5, max: 9 },
  monthly: { min: 25, max: 37 },
  quarterly: { min: 80, max: 100 },
  semi_annual: { min: 165, max: 200 },
  yearly: { min: 350, max: 380 },
};

/**
 * Calculate days between two YYYY-MM-DD date strings.
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.abs(Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Detect recurrence patterns in a group of transactions to the same merchant.
 */
export function detectRecurrence(transactions: Transaction[]): RecurrenceResult {
  const reasons: string[] = [];

  if (transactions.length === 0) {
    return {
      hasRecurrence: false,
      billingCycle: null,
      occurrenceCount: 0,
      averageIntervalDays: null,
      confidence: "none",
      reasons: ["No transactions found"],
    };
  }

  // Sort by date ascending
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  // Calculate intervals between consecutive transactions
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(daysBetween(sorted[i - 1]!.date, sorted[i]!.date));
  }

  // Check if amounts are consistent (within 5% tolerance)
  const amounts = sorted.map((t) => t.amount);
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const amountsConsistent = amounts.every(
    (a) => Math.abs(a - avgAmount) / avgAmount <= 0.05,
  );

  if (amountsConsistent && sorted.length > 1) {
    reasons.push(`Consistent amounts across ${sorted.length} payments (avg: ${avgAmount.toFixed(2)})`);
  } else if (!amountsConsistent && sorted.length > 1) {
    reasons.push(`Variable amounts across payments — may not be the same subscription`);
  }

  // If only one transaction, it's weak evidence
  if (sorted.length === 1) {
    reasons.push("Single transaction — weak evidence of recurrence");
    return {
      hasRecurrence: false,
      billingCycle: null,
      occurrenceCount: 1,
      averageIntervalDays: null,
      confidence: "weak",
      reasons,
    };
  }

  // Calculate average interval
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  // Determine billing cycle from average interval
  let detectedCycle: string | null = null;
  for (const [cycle, range] of Object.entries(CYCLE_RANGES)) {
    if (avgInterval >= range.min && avgInterval <= range.max) {
      detectedCycle = cycle;
      break;
    }
  }

  // Count how many intervals fit the detected cycle
  let matchingIntervals = 0;
  if (detectedCycle) {
    const range = CYCLE_RANGES[detectedCycle]!;
    for (const interval of intervals) {
      if (interval >= range.min - 5 && interval <= range.max + 5) {
        matchingIntervals++;
      }
    }
  }

  // Determine confidence
  let confidence: RecurrenceResult["confidence"] = "none";
  if (detectedCycle && matchingIntervals >= 3) {
    confidence = "strong";
    reasons.push(
      `${matchingIntervals} of ${intervals.length} intervals match ${detectedCycle} cycle (avg ${Math.round(avgInterval)} days)`,
    );
  } else if (detectedCycle && matchingIntervals >= 2) {
    confidence = "moderate";
    reasons.push(
      `${matchingIntervals} of ${intervals.length} intervals match ${detectedCycle} cycle (avg ${Math.round(avgInterval)} days)`,
    );
  } else if (sorted.length >= 2) {
    confidence = "weak";
    reasons.push(`${sorted.length} transactions found but no clear cycle pattern (avg interval: ${Math.round(avgInterval)} days)`);
  }

  return {
    hasRecurrence: confidence === "strong" || confidence === "moderate",
    billingCycle: detectedCycle,
    occurrenceCount: sorted.length,
    averageIntervalDays: Math.round(avgInterval),
    confidence,
    reasons,
  };
}
