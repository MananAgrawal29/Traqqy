/**
 * Gmail API wrapper for fetching messages and managing OAuth tokens.
 */

import { google, type gmail_v1 } from "googleapis";
import { decryptToken, encryptToken } from "../encryption";
import { db } from "@workspace/db";
import { gmailConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

function getOAuth2Client() {
  const clientId = process.env["GOOGLE_OAUTH_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_OAUTH_CLIENT_SECRET"];
  const redirectUri = process.env["GOOGLE_OAUTH_REDIRECT_URI"];

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth configuration missing (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI)");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate the Google OAuth authorization URL.
 */
export function getAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state,
    prompt: "consent",
  });
}

/**
 * Exchange an authorization code for tokens and store them.
 */
export async function exchangeCode(code: string, clerkId: string): Promise<{ email: string }> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    throw new Error("Incomplete tokens received from Google");
  }

  // Get user's email address
  oauth2Client.setCredentials(tokens);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const profile = await gmail.users.getProfile({ userId: "me" });
  const email = profile.data.emailAddress || "";

  // Encrypt and store tokens
  const encryptedAccess = encryptToken(tokens.access_token);
  const encryptedRefresh = encryptToken(tokens.refresh_token);
  const tokenExpiry = new Date(tokens.expiry_date);

  // Upsert connection
  const existing = await db.query.gmailConnectionsTable.findFirst({
    where: eq(gmailConnectionsTable.clerkId, clerkId),
  });

  if (existing) {
    await db
      .update(gmailConnectionsTable)
      .set({
        email,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiry,
        disconnectedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(gmailConnectionsTable.clerkId, clerkId));
  } else {
    await db.insert(gmailConnectionsTable).values({
      clerkId,
      email,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiry,
    });
  }

  return { email };
}

/**
 * Get an authenticated Gmail client for a user, refreshing tokens if needed.
 */
export async function getGmailClient(clerkId: string): Promise<gmail_v1.Gmail> {
  const connection = await db.query.gmailConnectionsTable.findFirst({
    where: eq(gmailConnectionsTable.clerkId, clerkId),
  });

  if (!connection || connection.disconnectedAt) {
    throw new Error("Gmail not connected");
  }

  const oauth2Client = getOAuth2Client();
  const accessToken = decryptToken(connection.accessToken);
  const refreshToken = decryptToken(connection.refreshToken);

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: connection.tokenExpiry.getTime(),
  });

  // Refresh if expired (with 5-min buffer)
  if (connection.tokenExpiry.getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      if (credentials.access_token && credentials.expiry_date) {
        await db
          .update(gmailConnectionsTable)
          .set({
            accessToken: encryptToken(credentials.access_token),
            tokenExpiry: new Date(credentials.expiry_date),
            updatedAt: new Date(),
          })
          .where(eq(gmailConnectionsTable.clerkId, clerkId));

        oauth2Client.setCredentials(credentials);
      }
    } catch (err) {
      // Token refresh failed — mark as disconnected
      await db
        .update(gmailConnectionsTable)
        .set({ disconnectedAt: new Date(), updatedAt: new Date() })
        .where(eq(gmailConnectionsTable.clerkId, clerkId));
      throw new Error("Gmail token refresh failed. Please reconnect.");
    }
  }

  return google.gmail({ version: "v1", auth: oauth2Client });
}

/**
 * Search for messages matching a Gmail query.
 * Returns message IDs and basic metadata.
 */
export async function searchMessages(
  gmail: gmail_v1.Gmail,
  query: string,
  maxResults: number = 500,
): Promise<Array<{ id: string; threadId: string; date: string }>> {
  const messages: Array<{ id: string; threadId: string; date: string }> = [];
  let pageToken: string | undefined;
  let fetched = 0;

  while (fetched < maxResults) {
    const pageSize = Math.min(100, maxResults - fetched);
    const response = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: pageSize,
      pageToken,
      labelIds: ["INBOX"],
    });

    const msgs = response.data.messages || [];
    for (const msg of msgs) {
      if (msg.id && msg.threadId) {
        messages.push({
          id: msg.id,
          threadId: msg.threadId,
          date: "", // Will be filled by getMessageHeaders
        });
      }
    }

    fetched += msgs.length;
    pageToken = response.data.nextPageToken || undefined;

    if (!pageToken || msgs.length === 0) break;

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 100));
  }

  return messages;
}

/**
 * Get headers from a message (From, Subject, Date).
 * Uses metadata format to minimize data transfer.
 */
export async function getMessageHeaders(
  gmail: gmail_v1.Gmail,
  messageId: string,
): Promise<{ headers: Record<string, string>; snippet: string }> {
  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "metadata",
    metadataHeaders: ["From", "Subject", "Date"],
  });

  const headers: Record<string, string> = {};
  for (const header of response.data.payload?.headers || []) {
    if (header.name && header.value) {
      headers[header.name] = header.value;
    }
  }

  return {
    headers,
    snippet: response.data.snippet || "",
  };
}

/**
 * Revoke a Google OAuth token.
 */
export async function revokeToken(clerkId: string): Promise<void> {
  const connection = await db.query.gmailConnectionsTable.findFirst({
    where: eq(gmailConnectionsTable.clerkId, clerkId),
  });

  if (!connection) return;

  try {
    const accessToken = decryptToken(connection.accessToken);
    const oauth2Client = getOAuth2Client();
    await oauth2Client.revokeToken(accessToken);
  } catch {
    // Revocation may fail if token is already invalid — that's okay
  }

  // Delete connection record
  await db
    .delete(gmailConnectionsTable)
    .where(eq(gmailConnectionsTable.clerkId, clerkId));
}

/**
 * Build Gmail search queries for finding subscription-related emails.
 */
export function buildSearchQueries(monthsBack: number): string[] {
  const afterDate = new Date();
  afterDate.setMonth(afterDate.getMonth() - monthsBack);
  const afterStr = `${afterDate.getFullYear()}/${String(afterDate.getMonth() + 1).padStart(2, "0")}/${String(afterDate.getDate()).padStart(2, "0")}`;

  const baseAfter = `after:${afterStr}`;

  return [
    // Phase 1: Direct subscription-related keywords
    `(subject:(subscription OR renewal OR invoice OR receipt OR "payment confirmation" OR "auto-renew" OR membership OR "billing statement") OR subject:(billed OR charged)) ${baseAfter}`,

    // Phase 2: Known subscription service domains
    `(from:netflix.com OR from:spotify.com OR from:apple.com OR from:google.com OR from:adobe.com OR from:microsoft.com OR from:github.com OR from:zoom.us OR from:amazon.com OR from:disneyplus.com OR from:crunchyroll.com) ${baseAfter}`,

    // Phase 3: Payment provider transaction emails (broader)
    `(from:famapp OR from:phonepe OR from:"google pay" OR from:gpay OR from:paytm OR from:razorpay OR from:stripe) ${baseAfter}`,
  ];
}
