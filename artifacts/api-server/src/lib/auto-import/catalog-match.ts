/**
 * Match an extracted merchant name against the Traqqy catalog.
 * Uses the SHARED catalog from @workspace/catalog as the single source of truth.
 * Returns the best match or null.
 */

import { catalog as sharedCatalog, type CatalogEntry } from "@workspace/catalog";

export interface CatalogMatch {
  id: string;
  name: string;
  category: string;
  icon: string;
  defaultBillingCycle: string;
}

/**
 * Normalize a name for matching: lowercase, strip whitespace, strip common suffixes.
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/\.(com|in|org|net|io|co)$/i, "")
    .replace(/\b(premium|pro|plus|plan|subscription|membership)\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Convert a shared CatalogEntry to the auto-import CatalogMatch format.
 */
function toCatalogMatch(entry: CatalogEntry): CatalogMatch {
  return {
    id: entry.id,
    name: entry.name,
    category: entry.category,
    icon: entry.icon,
    defaultBillingCycle: entry.defaultBillingCycle,
  };
}

/**
 * Calculate simple Levenshtein distance between two strings.
 */
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

/**
 * Check if a normalized string contains the target as a whole-word match.
 * Uses simple boundary detection on alphanumeric characters.
 */
function hasWordBoundaryMatch(haystack: string, needle: string): boolean {
  if (haystack === needle) return true;
  if (needle.length <= 3) return haystack.includes(needle);

  const escapedNeedle = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const boundaryRegex = new RegExp(
    `(?:^|[^a-z0-9])${escapedNeedle}(?:[^a-z0-9]|$)`,
    "i",
  );
  return boundaryRegex.test(haystack);
}

/**
 * Match an extracted merchant name against the Traqqy catalog.
 * Uses the SHARED catalog (from @workspace/catalog) as the single source
 * of truth. This ensures auto-import and the main app use the same data.
 */
export function matchCatalog(merchantName: string): CatalogMatch | null {
  const normalizedInput = normalize(merchantName);
  if (!normalizedInput) return null;

  // 1. Exact match (after normalization)
  for (const entry of sharedCatalog) {
    if (normalize(entry.name) === normalizedInput) {
      return toCatalogMatch(entry);
    }
  }

  // 2. Substring containment with word-boundary validation
  // Prevents false positives like "artistsspotifycom" matching "spotify"
  for (const entry of sharedCatalog) {
    const normalizedEntry = normalize(entry.name);

    // If the catalog name is longer, check if input contains it at word boundary
    if (normalizedEntry.length >= 5 && normalizedInput.includes(normalizedEntry)) {
      if (hasWordBoundaryMatch(normalizedInput, normalizedEntry)) {
        return toCatalogMatch(entry);
      }
    }

    // If the input is shorter, check if it appears in the catalog name
    if (
      normalizedInput.length >= 4 &&
      normalizedEntry.includes(normalizedInput)
    ) {
      if (hasWordBoundaryMatch(normalizedEntry, normalizedInput)) {
        return toCatalogMatch(entry);
      }
    }
  }

  // 3. Fuzzy match (Levenshtein distance) — tighter thresholds
  for (const entry of sharedCatalog) {
    const normalizedEntry = normalize(entry.name);
    // Only fuzzy match if lengths are similar (within 30%)
    const lengthRatio = Math.abs(normalizedInput.length - normalizedEntry.length) / Math.max(normalizedInput.length, normalizedEntry.length);
    if (lengthRatio > 0.3) continue;

    const maxDist = normalizedEntry.length <= 5 ? 1 : 2;
    if (levenshtein(normalizedInput, normalizedEntry) <= maxDist) {
      return toCatalogMatch(entry);
    }
  }

  return null;
}
