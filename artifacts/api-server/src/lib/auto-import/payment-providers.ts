/**
 * Known payment provider domains.
 * Emails from these senders are treated as Tier 2 evidence (weaker than direct merchant emails).
 * The payment provider is NOT the subscription merchant.
 */
export const PAYMENT_PROVIDER_DOMAINS = new Set([
  // Indian payment apps
  "famapp.in",
  "fam.app",
  "phonepe.com",
  "pay.google.com",
  "googlepay",
  "paytm.com",
  "razorpay.com",
  // Google Play (subscription/purchase platform)
  "play.google.com",
  "payments.google.com",
  // International payment processors
  "stripe.com",
  "paypal.com",
  "venmo.com",
  "cash.app",
  "wise.com",
  "revolut.com",
  "square.com",
  "checkout.com",
  // Indian banks
  "hdfcbank.com",
  "icicibank.com",
  "sbi.co.in",
  "axisbank.com",
  "kotak.com",
  "yesbank.in",
  "indusind.com",
  "bobfinancial.com",
  // International banks
  "chase.com",
  "wellsfargo.com",
  "bankofamerica.com",
  "citi.com",
  "capitalone.com",
  "barclays.com",
  "hsbc.com",
  "lloydsbank.com",
  "natwest.com",
]);

/**
 * Display names of payment providers (for matching From display names).
 */
export const PAYMENT_PROVIDER_NAMES = new Set([
  "famapp",
  "fam",
  "phonepe",
  "phone pe",
  "google pay",
  "gpay",
  "google play",
  "play.google.com",
  "app store",
  "apple app store",
  "paytm",
  "razorpay",
  "stripe",
  "paypal",
  "venmo",
  "cashapp",
  "cash app",
  "wise",
  "revolut",
]);

/**
 * Known non-subscription merchants.
 * Transactions to these should generally not become subscription candidates.
 */
export const NON_SUBSCRIPTION_MERCHANTS = new Set([
  // Grocery
  "bigbasket",
  "blinkit",
  "zepto",
  "instamart",
  "dmart",
  "jiomart",
  "swiggy instamart",
  // Food delivery
  "swiggy",
  "zomato",
  "doordash",
  "ubereats",
  "uber eats",
  "grubhub",
  "instacart",
  "meesho",
  "fantastic foods",
  "food delivery",
  // Ride sharing
  "uber",
  "lyft",
  "ola",
  "rapido",
  "blablacar",
  // Fuel
  "shell",
  "bp",
  "indian oil",
  "hpcl",
  "bpcl",
  "ioc",
  "reliance petro",
  "essel propack",
  // One-time shopping (generic)
  "amazon.in order",
  "amazon order",
  "flipkart order",
  "myntra order",
  "ajio order",
  // Transfers / P2P
  "gpay transfer",
  "phonepe transfer",
  "upi transfer",
  "neft transfer",
  "imps transfer",
  // Utilities (bills, not subscriptions)
  "electricity",
  "water bill",
  "gas bill",
  "broadband bill",
  "mobile recharge",
  "airtel bill",
  "jio bill",
  "bsnl bill",
]);

/**
 * Keywords in email subjects that strongly indicate non-subscription emails.
 */
export const ONE_TIME_KEYWORDS = [
  "order confirmed",
  "order placed",
  "order delivered",
  "shipping",
  "dispatched",
  "on its way",
  "refund",
  "cancelled",
  "canceled",
  "payment failed",
  "payment unsuccessful",
  "transaction failed",
  "otp",
  "one-time",
  "single payment",
  "cart",
  "checkout",
  "complete your purchase",
  "track your order",
  "return",
  "replacement",
  "cashback",
  "offer",
  "deal",
  "sale",
  "festival",
  "discount",
  "purchase",
  "thank you for your",
  "transaction id",
];

/**
 * Keywords in email subjects that strongly indicate subscription/recurring emails.
 *
 * NOTE: "charged" and "card ending" are intentionally EXCLUDED because they
 * appear in ALL bank/payment-provider transaction emails regardless of whether
 * the underlying transaction is a subscription or a one-time purchase.
 */
export const SUBSCRIPTION_KEYWORDS = [
  "subscription",
  "renewal",
  "renew",
  "auto-renew",
  "auto renew",
  "billed",
  "invoice",
  "receipt",
  "membership",
  "plan",
  "pro plan",
  "your plan",
  "billing",
  "payment confirmation",
  "payment successful",
  "recurring",
  "monthly",
  "annual",
  "yearly",
  "quarterly",
  "statement",
  "payment method",
];

/**
 * Platform names that are NOT the actual subscription merchant.
 * When the merchant guess equals one of these, the system should try harder
 * to find the underlying product from the email content.
 */
export const PLATFORM_NAMES = new Set([
  "google play",
  "google play store",
  "play store",
  "app store",
  "apple app store",
  "amazon marketplace",
  "stripe",
  "paypal",
]);

/**
 * Known newsletter/marketing platforms (emails from these should be skipped).
 */
export const MARKETING_PLATFORMS = new Set([
  "mailchimp.com",
  "sendgrid.net",
  "sendgrid.com",
  "mandrillapp.com",
  "mailerlite.com",
  "convertkit.com",
  "buttondown.email",
  "substack.com",
  "beehiiv.com",
  "revue.co",
  "ghost.io",
  "listmonk",
  "postmark",
  "sparkpost",
  "mailgun.org",
]);
