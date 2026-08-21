import { PAYMENT_PROVIDER_DOMAINS, PAYMENT_PROVIDER_NAMES } from "./payment-providers";

/**
 * Extract structured data from email headers and snippets.
 * This is the first stage of the detection pipeline.
 */

export interface ExtractedEmail {
  messageId: string;
  threadId: string;
  date: string; // YYYY-MM-DD
  senderEmail: string;
  senderDomain: string;
  senderName: string;
  subject: string;
  snippet: string;
  // Extracted fields (may be null)
  amount: number | null;
  currency: string | null;
  merchantGuess: string | null;
  isPaymentProvider: boolean;
  hasSubscriptionLanguage: boolean;
  hasOneTimeLanguage: boolean;
}

// Amount patterns for common currencies
const AMOUNT_PATTERNS = [
  // ₹1,234 or ₹1234
  /(?:₹|INR)\s*([\d,]+(?:\.\d{1,2})?)/i,
  // $1,234.56 or USD 1234
  /(?:\$|USD)\s*([\d,]+(?:\.\d{1,2})?)/i,
  // €1,234.56 or EUR 1234
  /(?:€|EUR)\s*([\d,]+(?:\.\d{1,2})?)/i,
  // £1,234.56 or GBP 1234
  /(?:£|GBP)\s*([\d,]+(?:\.\d{1,2})?)/i,
  // Generic: amount followed by currency word
  /([\d,]+(?:\.\d{1,2})?)\s*(?:USD|EUR|GBP|INR|CAD|AUD|JPY)/i,
  // Patterns like "Rs. 1,234" or "Rs 1234"
  /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i,
];

const CURRENCY_MAP: Record<string, string> = {
  "₹": "INR",
  "Rs.": "INR",
  "Rs": "INR",
  "$": "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
};

function extractAmount(text: string): { amount: number; currency: string } | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const amount = parseFloat(match[1]!.replace(/,/g, ""));
      if (!isNaN(amount) && amount > 0) {
        // Determine currency from the match
        let currency = "USD"; // default
        const symbol = match[0]!.charAt(0);
        if (symbol in CURRENCY_MAP) {
          currency = CURRENCY_MAP[symbol]!;
        } else {
          // Check for currency word
          const currencyMatch = match[0]!.match(/(USD|EUR|GBP|INR|CAD|AUD|JPY)/i);
          if (currencyMatch) {
            currency = currencyMatch[1]!.toUpperCase();
          }
        }
        return { amount, currency };
      }
    }
  }
  return null;
}

function extractDateFromSubject(subject: string): string | null {
  // "January 15, 2025" or "Jan 15, 2025"
  const longDate = subject.match(
    /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*(\d{4})/i,
  );
  if (longDate) {
    const monthMap: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };
    const month = monthMap[longDate[2]!.substring(0, 3).toLowerCase()];
    if (month) {
      return `${longDate[3]}-${month}-${longDate[1]!.padStart(2, "0")}`;
    }
  }

  // "2025-01-15" or "2025/01/15"
  const isoDate = subject.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (isoDate) {
    return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
  }

  // "01/15/2025" (US format)
  const usDate = subject.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usDate) {
    return `${usDate[3]}-${usDate[1]!.padStart(2, "0")}-${usDate[2]!.padStart(2, "0")}`;
  }

  return null;
}

function extractMerchantFromPaymentProvider(text: string): string | null {
  // "paid to Netflix" / "payment to Netflix"
  const patterns = [
    /paid to (.+?)(?:\s+for|\s+on|\s*$|\.|,|\n)/i,
    /payment to (.+?)(?:\s+for|\s+on|\s*$|\.|,|\n)/i,
    /debited for (.+?)(?:\s*$|\.|,|\n)/i,
    /charged by (.+?)(?:\s+for|\s+on|\s*$|\.|,|\n)/i,
    /transferred to (.+?)(?:\s*$|\.|,|\n)/i,
    /sent to (.+?)(?:\s+for|\s*$|\.|,|\n)/i,
    // Bank/card transaction patterns: "at BigBasket", "at Netflix"
    /\bat\s+(.+?)(?:\s+on\s+|\s+for\s+|\s*$|\.|,|\n)/i,
    // Google Play receipt patterns: "for YouTube Premium", "to YouTube Premium"
    /(?:for|to|toward|towards)\s+(.+?)(?:\s+\(|\s+on\s+|\s*$|\.|,|\n)/i,
    // "₹649 Netflix" or "Netflix ₹649"
    /(?:₹|INR|Rs\.?|\$|USD|€|EUR|£|GBP)\s*[\d,]+(?:\.\d+)?\s+(.+?)(?:\s*$|\.|,|\n)/i,
    /(.+?)\s+(?:₹|INR|Rs\.?|\$|USD|€|EUR|£|GBP)\s*[\d,]+(?:\.\d+)?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const merchant = match[1]!.trim();
      // Filter out common noise
      if (
        merchant.length > 1 &&
        merchant.length < 80 &&
        !/^\d+$/.test(merchant) &&
        !/^payment$/i.test(merchant) &&
        !/^transaction$/i.test(merchant)
      ) {
        return merchant;
      }
    }
  }
  return null;
}

function extractMerchantFromSubject(subject: string): string | null {
  // "Your Netflix subscription has renewed" → Netflix
  const patterns = [
    /your (.+?) (?:subscription|membership|plan|renewal|receipt|invoice)/i,
    /(.+?) (?:subscription|membership|plan) (?:renewed|renewal|confirmation)/i,
    /receipt from (.+?)(?:\s*$|\.|,|\n)/i,
    /invoice from (.+?)(?:\s*$|\.|,|\n)/i,
    /payment to (.+?)(?:\s+for|\s*$|\.|,|\n)/i,
    /(.+?) (?:billing|payment|charge)/i,
  ];

  for (const pattern of patterns) {
    const match = subject.match(pattern);
    if (match && match[1]) {
      const merchant = match[1]!.trim();
      if (merchant.length > 1 && merchant.length < 60) {
        return merchant;
      }
    }
  }
  return null;
}

/**
 * Noise words that should not be extracted as product/service names.
 */
const PRODUCT_NOISE = new Set([
  "google", "play", "order", "receipt", "transaction", "payment",
  "store", "marketplace", "app store", "charge", "purchase",
  "invoice", "billing", "subscription", "membership",
]);

/**
 * Extract the underlying product/service from a payment-provider email.
 * This is the generalized version — works for Google Play, App Store,
 * bank transaction alerts, payment apps, etc.
 *
 * The email body/snippet typically names the actual product even when
 * the subject or sender is the payment platform.
 */
function extractProductFromPaymentProvider(text: string): string | null {
  const patterns = [
    // "Product Name (Google Play)" / "Product Name (App Store)"
    /(.+?)\s*\(\s*(?:google play|app store|play store|apple|apple inc)\s*\)/i,

    // "Subscription to Product Name"
    /subscription\s+(?:to|for)\s+(.+?)(?:\s*\(|\s*\.\s|\s+has\s|\s+will\s|\s+on\s|$)/i,

    // "Purchase of Product Name"
    /purchase\s+(?:of|for)\s+(.+?)(?:\s*\(|\s*\.\s|\s+has\s|$)/i,

    // "Product: Name" or "Description: Name"
    /(?:product|description|item|service)\s*[:\-]\s*(.+?)(?:\s*$|\.|,)/i,

    // "for Product Name" / "to Product Name" / "toward Product Name"
    /(?:for|to|toward|towards)\s+(.+?)(?:\s*\(|\s+on\s+|\s+for\s+|\s*$|\.|,|\n)/i,

    // "at Product Name" (bank alerts: "charged ₹X at Netflix")
    /\bat\s+(.+?)(?:\s+on\s+|\s+for\s+|\s*$|\.|,|\n)/i,

    // Capitalized multi-word product name followed by currency symbol (with optional space)
    /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)\s*[₹$€£]/,

    // Product name + subscription tier: "Spotify Premium $9.99"
    /([A-Za-z]+(?:\s+(?:Premium|Pro|Plus|Music|Video|Cloud|One|Core|Standard|Family|Unlimited)))(?:\s+[₹$€£]|\s+INR|\s+USD|\s*\()/i,

    // "paid to Product" / "payment to Product" / "debited for Product"
    /(?:paid|payment|debited|transferred)\s+(?:to|for)\s+(.+?)(?:\s+for|\s+on|\s*$|\.|,|\n)/i,

    // Amount followed by product (with optional space): "₹649 Netflix"
    /(?:₹|INR|Rs\.?|\$|USD|€|EUR|£|GBP)\s*[\d,]+(?:\.\d+)?\s+(.+?)(?:\s*$|\.|,|\n)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let product = match[1]!.trim();

      // Strip leading noise words (platform names, generic terms)
      // e.g., "Google Play Order YouTube Premium" → "YouTube Premium"
      const words = product.split(/\s+/);
      while (words.length > 1 && PRODUCT_NOISE.has(words[0]!.toLowerCase())) {
        words.shift();
      }
      product = words.join(" ");

      // Filter out noise: too short/long, numbers-only, or known noise words
      if (
        product.length > 2 &&
        product.length < 80 &&
        !/^\d/.test(product) &&
        !PRODUCT_NOISE.has(product.toLowerCase())
      ) {
        return product;
      }
    }
  }

  return null;
}

/**
 * Extract structured data from a Gmail message's headers and snippet.
 */
export function extractEmailData(params: {
  messageId: string;
  threadId: string;
  headers: Record<string, string>;
  snippet: string;
}): ExtractedEmail {
  const { messageId, threadId, headers, snippet } = params;

  const from = headers["From"] || headers["from"] || "";
  const subject = headers["Subject"] || headers["subject"] || "";
  const date = headers["Date"] || headers["date"] || "";

  // Parse sender email and domain
  const senderEmailMatch = from.match(/<(.+?)>/) || [null, from];
  const senderEmail = (senderEmailMatch[1] || from).trim().toLowerCase();
  const senderDomain = senderEmail.split("@")[1] || "";
  const senderNameMatch = from.match(/^"?([^"<]+)"?\s*</);
  const senderName = (senderNameMatch?.[1] || senderDomain).trim();

  // Parse date
  let parsedDate = date;
  try {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      parsedDate = d.toISOString().split("T")[0]!;
    }
  } catch {
    // Use raw date string
  }

  // Extract amount from subject + snippet
  const combinedText = `${subject} ${snippet}`;
  const amountResult = extractAmount(combinedText);

  // Check for subscription/one-time language
  const lowerSubject = subject.toLowerCase();
  const lowerSnippet = snippet.toLowerCase();
  const lowerCombined = `${lowerSubject} ${lowerSnippet}`;

  const subscriptionKeywords = [
    "subscription", "renewal", "renew", "auto-renew", "billed",
    "charged", "invoice", "receipt", "membership", "plan",
    "premium", "pro plan", "billing", "recurring",
  ];

  const oneTimeKeywords = [
    "order confirmed", "order placed", "order delivered",
    "shipping", "dispatched", "on its way", "refund",
    "cancelled", "canceled", "payment failed", "transaction failed",
    "otp", "cart", "checkout", "track your order", "return",
    "purchase", "thank you for your", "transaction id",
  ];

  const hasSubscriptionLanguage = subscriptionKeywords.some((k) =>
    lowerCombined.includes(k),
  );
  const hasOneTimeLanguage = oneTimeKeywords.some((k) =>
    lowerCombined.includes(k),
  );

  // Check if sender is a payment provider (imported at top level)
  const isPaymentProvider =
    PAYMENT_PROVIDER_DOMAINS.has(senderDomain) ||
    PAYMENT_PROVIDER_NAMES.has(senderName.toLowerCase()) ||
    PAYMENT_PROVIDER_NAMES.has(senderEmail.split("@")[0] || "");

  // Try to extract merchant
  let merchantGuess: string | null = null;

  // 1. For payment providers, try to extract the underlying product from
  //    the combined text (subject + snippet). The snippet/body is where
  //    payment-provider emails name the actual service being paid for.
  if (isPaymentProvider) {
    // Try the general product extraction first (works for any platform)
    merchantGuess = extractProductFromPaymentProvider(combinedText);
    // Fall back to the original payment-provider extraction
    if (!merchantGuess) {
      merchantGuess = extractMerchantFromPaymentProvider(combinedText);
    }
  }

  // 2. Try extracting from subject using direct merchant patterns
  if (!merchantGuess) {
    merchantGuess = extractMerchantFromSubject(subject);
  }

  // 3. For non-payment-provider senders, try to extract from subject using
  //    generic patterns (e.g. "Netflix Your subscription has renewed")
  if (!merchantGuess && !isPaymentProvider) {
    const genericPatterns = [
      /your (.+?) (?:subscription|membership|plan|renewal|receipt|invoice|order|confirmation)/i,
      /(.+?) (?:subscription|membership|plan) (?:renewed|renewal|confirmation)/i,
      /receipt from (.+?)(?:\s*$|\.|,|\n)/i,
      /invoice from (.+?)(?:\s*$|\.|,|\n)/i,
      /payment to (.+?)(?:\s+for|\s*$|\.|,|\n)/i,
      /(.+?) (?:billing|payment|charge)/i,
    ];
    for (const pattern of genericPatterns) {
      const match = subject.match(pattern);
      if (match && match[1]) {
        const merchant = match[1]!.trim();
        if (merchant.length > 1 && merchant.length < 60) {
          merchantGuess = merchant;
          break;
        }
      }
    }
  }

  return {
    messageId,
    threadId,
    date: parsedDate,
    senderEmail,
    senderDomain,
    senderName,
    subject,
    snippet,
    amount: amountResult?.amount ?? null,
    currency: amountResult?.currency ?? null,
    merchantGuess,
    isPaymentProvider,
    hasSubscriptionLanguage,
    hasOneTimeLanguage,
  };
}
