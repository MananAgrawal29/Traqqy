/**
 * Fetch a user's primary email address from the Clerk Backend API.
 * Uses the CLERK_SECRET_KEY to authenticate.
 * Returns null if the email cannot be determined.
 */
export async function getClerkUserEmail(clerkId: string): Promise<string | null> {
  const secretKey = process.env["CLERK_SECRET_KEY"];
  if (!secretKey) {
    return null;
  }

  try {
    const response = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const user = await response.json() as {
      email_addresses?: Array<{ email_address: string; verification?: { status: string } }>;
      primary_email_address_id?: string;
    };

    if (!user.email_addresses || user.email_addresses.length === 0) {
      return null;
    }

    // Prefer the primary email address
    if (user.primary_email_address_id) {
      const primary = user.email_addresses.find(
        (e) => e.email_address && user.primary_email_address_id
      );
      if (primary?.email_address) {
        return primary.email_address;
      }
    }

    // Fall back to the first email address
    return user.email_addresses[0]?.email_address ?? null;
  } catch {
    return null;
  }
}
