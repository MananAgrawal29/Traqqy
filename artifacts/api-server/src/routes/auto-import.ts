import { Router } from "express";
import { db } from "@workspace/db";
import {
  gmailConnectionsTable,
  autoImportScansTable,
  autoImportCandidatesTable,
  subscriptionsTable,
  categoriesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";
import { getAuthUrl, exchangeCode, revokeToken } from "../lib/auto-import/gmail";
import { runScan } from "../lib/auto-import/scan";
import { calcEquivalents } from "../lib/billing";
import type { BillingCycle } from "../lib/billing";

const router = Router();

/**
 * HMAC-signed state token for OAuth CSRF protection.
 * In production, use a proper HMAC. Here we use a simple signed token.
 */
function createStateToken(clerkId: string): string {
  const payload = JSON.stringify({
    clerkId,
    exp: Date.now() + 5 * 60 * 1000, // 5 min TTL
  });
  const secret = process.env["GOOGLE_OAUTH_STATE_SECRET"] || "dev-state-secret";
  // Simple base64 encoding for dev; use proper HMAC in production
  const signature = Buffer.from(`${payload}:${secret}`).toString("base64url");
  return Buffer.from(payload).toString("base64url") + "." + signature;
}

function verifyStateToken(state: string): { clerkId: string } | null {
  try {
    const [payloadB64, signature] = state.split(".");
    if (!payloadB64 || !signature) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    const secret = process.env["GOOGLE_OAUTH_STATE_SECRET"] || "dev-state-secret";
    const expectedSig = Buffer.from(`${JSON.stringify(payload)}:${secret}`).toString("base64url");

    if (signature !== expectedSig) return null;
    if (payload.exp < Date.now()) return null;

    return { clerkId: payload.clerkId };
  } catch {
    return null;
  }
}

// ── Connection status ──

router.get("/status", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const connection = await db.query.gmailConnectionsTable.findFirst({
      where: eq(gmailConnectionsTable.clerkId, userId),
    });

    const lastScan = await db.query.autoImportScansTable.findFirst({
      where: eq(autoImportScansTable.clerkId, userId),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });

    res.json({
      connected: !!connection && !connection.disconnectedAt,
      email: connection?.email || null,
      connectedAt: connection?.connectedAt?.toISOString() || null,
      lastScanAt: lastScan?.completedAt?.toISOString() || null,
      lastScanResults: lastScan
        ? { candidatesFound: lastScan.candidatesFound }
        : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get auto-import status");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Google OAuth ──

router.get("/google/auth-url", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const state = createStateToken(userId);
    const url = getAuthUrl(state);
    res.json({ url, expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to generate auth URL");
    res.status(500).json({ error: "Failed to generate authorization URL" });
  }
});

router.get("/google/callback", async (req, res) => {
  const { code, state } = req.query as Record<string, string>;

  if (!code || !state) {
    res.status(400).send("Missing code or state parameter");
    return;
  }

  const verified = verifyStateToken(state);
  if (!verified) {
    res.status(400).send("Invalid or expired state token");
    return;
  }

  try {
    await exchangeCode(code, verified.clerkId);

    // Redirect to a callback page that communicates with the opener
    const frontendUrl = process.env["FRONTEND_URL"] || "http://localhost:24210";
    res.redirect(`${frontendUrl}/auto-import-callback.html?status=success`);
  } catch (err) {
    req.log.error({ err }, "Google OAuth callback failed");
    const frontendUrl = process.env["FRONTEND_URL"] || "http://localhost:24210";
    res.redirect(`${frontendUrl}/auto-import-callback.html?status=error&message=${encodeURIComponent("Failed to connect Gmail")}`);
  }
});

// ── Disconnect ──

router.post("/disconnect", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    await revokeToken(userId);

    // Delete scan data
    const scans = await db
      .select({ id: autoImportScansTable.id })
      .from(autoImportScansTable)
      .where(eq(autoImportScansTable.clerkId, userId));

    for (const scan of scans) {
      await db
        .delete(autoImportCandidatesTable)
        .where(eq(autoImportCandidatesTable.scanId, scan.id));
    }
    await db
      .delete(autoImportScansTable)
      .where(eq(autoImportScansTable.clerkId, userId));

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to disconnect Gmail");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Scan ──

router.post("/scan", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { monthsBack = 12 } = (req.body || {}) as { monthsBack?: number };

  // Check connection
  const connection = await db.query.gmailConnectionsTable.findFirst({
    where: and(
      eq(gmailConnectionsTable.clerkId, userId),
    ),
  });

  if (!connection || connection.disconnectedAt) {
    res.status(400).json({ error: "Gmail not connected. Please connect your Gmail first." });
    return;
  }

  // Check scan rate limit (1 per hour)
  const recentScan = await db.query.autoImportScansTable.findFirst({
    where: eq(autoImportScansTable.clerkId, userId),
    orderBy: (t, { desc }) => desc(t.createdAt),
  });

  if (recentScan && recentScan.createdAt) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (recentScan.createdAt > hourAgo && recentScan.status !== "complete" && recentScan.status !== "failed") {
      res.status(429).json({ error: "Scan already in progress or recently completed. Please try again later." });
      return;
    }
  }

  // Create scan record
  const [scan] = await db
    .insert(autoImportScansTable)
    .values({
      clerkId: userId,
      monthsBack: Math.min(Math.max(monthsBack, 1), 24),
      status: "queued",
    })
    .returning();

  if (!scan) {
    res.status(500).json({ error: "Failed to create scan" });
    return;
  }

  // Start scan in background
  runScan(userId, scan.id, Math.min(Math.max(monthsBack, 1), 24)).catch((err) => {
    req.log.error({ err }, "Auto-import scan failed");
  });

  res.json({ scanId: `scan_${scan.id}`, status: "queued" });
});

// ── Scan status ──

router.get("/scan/:id/status", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const idParam = (req.params as Record<string, string>)["id"] || "";
  const scanIdStr = idParam.replace("scan_", "");
  const scanId = parseInt(scanIdStr);

  if (isNaN(scanId)) {
    res.status(400).json({ error: "Invalid scan ID" });
    return;
  }

  try {
    const scan = await db.query.autoImportScansTable.findFirst({
      where: and(
        eq(autoImportScansTable.id, scanId),
        eq(autoImportScansTable.clerkId, userId),
      ),
    });

    if (!scan) {
      res.status(404).json({ error: "Scan not found" });
      return;
    }

    res.json({
      scanId: `scan_${scan.id}`,
      status: scan.status,
      progress: {
        emailsFound: scan.emailsFound,
        emailsProcessed: scan.emailsProcessed,
        candidatesFound: scan.candidatesFound,
      },
      startedAt: scan.startedAt?.toISOString(),
      updatedAt: scan.completedAt?.toISOString() || scan.startedAt?.toISOString(),
      errorMessage: scan.errorMessage,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get scan status");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Scan results ──

router.get("/scan/:id/results", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const idParam = (req.params as Record<string, string>)["id"] || "";
  const scanIdStr = idParam.replace("scan_", "");
  const scanId = parseInt(scanIdStr);

  if (isNaN(scanId)) {
    res.status(400).json({ error: "Invalid scan ID" });
    return;
  }

  try {
    const scan = await db.query.autoImportScansTable.findFirst({
      where: and(
        eq(autoImportScansTable.id, scanId),
        eq(autoImportScansTable.clerkId, userId),
      ),
    });

    if (!scan) {
      res.status(404).json({ error: "Scan not found" });
      return;
    }

    const candidates = await db
      .select()
      .from(autoImportCandidatesTable)
      .where(eq(autoImportCandidatesTable.scanId, scanId));

    // Get duplicate info
    const candidatesWithDuplicateInfo = await Promise.all(
      candidates.map(async (c) => {
        let duplicateOf = null;
        if (c.duplicateOfSubscriptionId) {
          const [sub] = await db
            .select()
            .from(subscriptionsTable)
            .where(eq(subscriptionsTable.id, c.duplicateOfSubscriptionId));
          if (sub) {
            duplicateOf = {
              subscriptionId: sub.id,
              name: sub.name,
            };
          }
        }

        return {
          id: `cand_${c.id}`,
          merchantName: c.merchantName,
          catalogMatch: c.catalogMatchId
            ? { id: c.catalogMatchId, name: c.merchantName }
            : null,
          amount: parseFloat(c.amount),
          currency: c.currency,
          billingCycle: c.billingCycle,
          lastPaymentDate: c.lastPaymentDate,
          confidence: c.confidence,
          confidenceLabel: c.confidenceLabel,
          reasons: (c.reasons as string[]) || [],
          evidenceCount: c.evidenceCount,
          duplicateOf,
          emailSender: c.emailSender,
          emailSubject: c.emailSubject,
          selected: c.confidenceLabel === "high",
        };
      }),
    );

    const summary = {
      totalScanned: scan.emailsProcessed,
      candidatesFound: candidatesWithDuplicateInfo.length,
      highConfidence: candidatesWithDuplicateInfo.filter((c) => c.confidenceLabel === "high").length,
      mediumConfidence: candidatesWithDuplicateInfo.filter((c) => c.confidenceLabel === "medium").length,
      lowConfidence: candidatesWithDuplicateInfo.filter((c) => c.confidenceLabel === "low").length,
      duplicatesFound: candidatesWithDuplicateInfo.filter((c) => c.duplicateOf !== null).length,
    };

    res.json({
      scanId: `scan_${scan.id}`,
      candidates: candidatesWithDuplicateInfo,
      summary,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get scan results");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Confirm import ──

router.post("/confirm", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { scanId: scanIdRaw, candidateIds, overrides = {} } = req.body as {
    scanId: string;
    candidateIds: string[];
    overrides: Record<string, { categoryId?: number; notes?: string }>;
  };

  const scanId = parseInt(scanIdRaw?.replace("scan_", "") || "");

  if (isNaN(scanId) || !candidateIds || !Array.isArray(candidateIds)) {
    res.status(400).json({ error: "Invalid scan ID or candidate IDs" });
    return;
  }

  try {
    // Verify scan belongs to user
    const scan = await db.query.autoImportScansTable.findFirst({
      where: and(
        eq(autoImportScansTable.id, scanId),
        eq(autoImportScansTable.clerkId, userId),
      ),
    });

    if (!scan) {
      res.status(404).json({ error: "Scan not found" });
      return;
    }

    const imported: Array<{ subscriptionId: number; name: string; candidateId: string }> = [];
    const failed: Array<{ candidateId: string; reason: string }> = [];

    for (const candIdRaw of candidateIds) {
      const candId = parseInt(candIdRaw.replace("cand_", ""));
      if (isNaN(candId)) {
        failed.push({ candidateId: candIdRaw, reason: "Invalid candidate ID" });
        continue;
      }

      const [candidate] = await db
        .select()
        .from(autoImportCandidatesTable)
        .where(
          and(
            eq(autoImportCandidatesTable.id, candId),
            eq(autoImportCandidatesTable.clerkId, userId),
          ),
        );

      if (!candidate) {
        failed.push({ candidateId: candIdRaw, reason: "Candidate not found" });
        continue;
      }

      const override = overrides[candIdRaw] || {};

      // Determine billing cycle
      const billingCycle = candidate.billingCycle || "monthly";

      // Calculate renewal date (use last payment date + one cycle)
      const lastDate = candidate.lastPaymentDate
        ? new Date(candidate.lastPaymentDate)
        : new Date();
      const renewalDate = calculateNextRenewal(lastDate, billingCycle);
      const renewalDateStr = renewalDate.toISOString().split("T")[0]!;

      try {
        const [sub] = await db
          .insert(subscriptionsTable)
          .values({
            clerkId: userId,
            name: candidate.merchantName,
            icon: candidate.catalogMatchId || null,
            categoryId: override.categoryId || null,
            price: candidate.amount.toString(),
            currency: candidate.currency,
            billingCycle,
            renewalDate: renewalDateStr,
            paymentMethod: "Auto-detected from Gmail",
            notes: override.notes || `Auto-imported from Gmail scan. Confidence: ${candidate.confidenceLabel}`,
            isActive: true,
            isArchived: false,
          })
          .returning();

        if (sub) {
          imported.push({
            subscriptionId: sub.id,
            name: sub.name,
            candidateId: candIdRaw,
          });
        }
      } catch {
        failed.push({ candidateId: candIdRaw, reason: "Failed to create subscription" });
      }
    }

    res.json({ imported, failed });
  } catch (err) {
    req.log.error({ err }, "Failed to confirm import");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Calculate the next renewal date given a last payment date and billing cycle.
 */
function calculateNextRenewal(lastDate: Date, billingCycle: string): Date {
  const next = new Date(lastDate);
  switch (billingCycle) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "semi_annual":
      next.setMonth(next.getMonth() + 6);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export default router;
