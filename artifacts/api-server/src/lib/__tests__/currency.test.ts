import { describe, it, expect } from "vitest";
import { convertAmount, roundMoney } from "@workspace/currencies/convert";
import { SUPPORTED_CURRENCY_CODES, isSupportedCurrency, getCurrency, formatAmount } from "@workspace/currencies";

// Deterministic test rates (USD-based)
const TEST_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.85,
  INR: 83,
  GBP: 0.79,
  JPY: 149,
  CAD: 1.36,
  AUD: 1.53,
  CNY: 7.24,
  SGD: 1.34,
  TRY: 27.5,
  CHF: 0.88,
  NZD: 1.67,
  KRW: 1320,
  HKD: 7.82,
  PLN: 4.03,
};

describe("convertAmount", () => {
  it("same currency returns amount unchanged", () => {
    expect(convertAmount(100, "INR", "INR", TEST_RATES)).toBe(100);
    expect(convertAmount(0, "USD", "USD", TEST_RATES)).toBe(0);
    expect(convertAmount(99.99, "EUR", "EUR", TEST_RATES)).toBe(99.99);
  });

  it("converts USD to EUR", () => {
    // 100 USD / 1 * 0.85 = 85 EUR
    const result = convertAmount(100, "USD", "EUR", TEST_RATES);
    expect(result).toBeCloseTo(85, 2);
  });

  it("converts EUR to INR", () => {
    // 100 EUR / 0.85 * 83 = 9764.71 INR
    const result = convertAmount(100, "EUR", "INR", TEST_RATES);
    expect(result).toBeCloseTo(9764.71, 0);
  });

  it("converts INR to USD", () => {
    // 8300 INR / 83 * 1 = 100 USD
    const result = convertAmount(8300, "INR", "USD", TEST_RATES);
    expect(result).toBeCloseTo(100, 2);
  });

  it("converts GBP to JPY", () => {
    // 100 GBP / 0.79 * 149 = 18860.76 JPY
    const result = convertAmount(100, "GBP", "JPY", TEST_RATES);
    expect(result).toBeCloseTo(18860.76, 0);
  });

  it("returns null for unsupported currency", () => {
    expect(convertAmount(100, "XYZ", "USD", TEST_RATES)).toBeNull();
    expect(convertAmount(100, "USD", "XYZ", TEST_RATES)).toBeNull();
    expect(convertAmount(100, "XYZ", "ABC", TEST_RATES)).toBeNull();
  });

  it("returns null for zero source rate", () => {
    const rates = { ...TEST_RATES, BAD: 0 };
    expect(convertAmount(100, "BAD", "USD", rates)).toBeNull();
  });

  it("handles zero amount", () => {
    expect(convertAmount(0, "USD", "EUR", TEST_RATES)).toBe(0);
  });

  it("handles negative amounts", () => {
    const result = convertAmount(-100, "USD", "EUR", TEST_RATES);
    expect(result).toBeCloseTo(-85, 2);
  });

  it("preserves full precision (no rounding)", () => {
    // 1 USD = 0.85 EUR, so 1/3 USD should preserve precision
    const result = convertAmount(1 / 3, "USD", "EUR", TEST_RATES);
    expect(result).toBeCloseTo(0.28333, 4);
  });
});

describe("roundMoney", () => {
  it("rounds to 2 decimal places", () => {
    expect(roundMoney(100.001)).toBe(100);
    expect(roundMoney(100.005)).toBe(100.01);
    expect(roundMoney(100.004)).toBe(100);
    expect(roundMoney(99.999)).toBe(100);
  });

  it("handles already-rounded values", () => {
    expect(roundMoney(100.50)).toBe(100.5);
    expect(roundMoney(0)).toBe(0);
  });
});

describe("Supported currencies", () => {
  it("has exactly 15 supported currencies", () => {
    expect(SUPPORTED_CURRENCY_CODES).toHaveLength(15);
  });

  it("includes all required currencies", () => {
    const required = ["INR", "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CNY", "SGD", "TRY", "CHF", "NZD", "KRW", "HKD", "PLN"];
    for (const code of required) {
      expect(SUPPORTED_CURRENCY_CODES).toContain(code);
      expect(isSupportedCurrency(code)).toBe(true);
    }
  });

  it("rejects unsupported currencies", () => {
    expect(isSupportedCurrency("XYZ")).toBe(false);
    expect(isSupportedCurrency("AED")).toBe(false);
    expect(isSupportedCurrency("SAR")).toBe(false);
    expect(isSupportedCurrency("BTC")).toBe(false);
  });

  it("getCurrency returns correct data", () => {
    const inr = getCurrency("INR");
    expect(inr).toBeDefined();
    expect(inr!.code).toBe("INR");
    expect(inr!.name).toBe("Indian Rupee");
    expect(inr!.symbol).toBe("₹");

    const usd = getCurrency("USD");
    expect(usd).toBeDefined();
    expect(usd!.code).toBe("USD");
  });

  it("getCurrency returns undefined for unknown code", () => {
    expect(getCurrency("XYZ")).toBeUndefined();
  });
});

describe("formatAmount", () => {
  it("formats INR correctly", () => {
    const result = formatAmount(1234.56, "INR");
    expect(result).toContain("1");
    expect(result).toContain("234");
  });

  it("formats USD correctly", () => {
    const result = formatAmount(99.99, "USD");
    expect(result).toContain("99.99");
  });
});

describe("Mixed subscription aggregate conversion", () => {
  it("converts mixed currencies to default currency and sums", () => {
    const subscriptions = [
      { amount: 15, currency: "USD" },    // $15
      { amount: 11, currency: "EUR" },    // €11
      { amount: 129, currency: "INR" },   // ₹129
      { amount: 4, currency: "USD" },     // $4
    ];

    // Convert all to INR
    let total = 0;
    for (const sub of subscriptions) {
      const converted = convertAmount(sub.amount, sub.currency, "INR", TEST_RATES);
      expect(converted).not.toBeNull();
      total += converted!;
    }

    // 15 USD → INR: 15/1*83 = 1245
    // 11 EUR → INR: 11/0.85*83 = 1074.12
    // 129 INR → INR: 129
    // 4 USD → INR: 4/1*83 = 332
    // Total ≈ 2780.12
    expect(roundMoney(total)).toBeCloseTo(2780.12, 0);
  });

  it("all same currency skips conversion", () => {
    const items = [
      { amount: 100, currency: "USD" },
      { amount: 200, currency: "USD" },
      { amount: 50, currency: "USD" },
    ];
    const allSame = items.every((i) => i.currency === "USD");
    expect(allSame).toBe(true);
    const total = items.reduce((s, i) => s + i.amount, 0);
    expect(total).toBe(350);
  });

  it("default currency change produces different totals", () => {
    const subs = [
      { amount: 15, currency: "USD" },
      { amount: 11, currency: "EUR" },
    ];

    // Convert to INR
    let inrTotal = 0;
    for (const sub of subs) {
      const c = convertAmount(sub.amount, sub.currency, "INR", TEST_RATES);
      if (c !== null) inrTotal += c;
    }

    // Convert to EUR
    let eurTotal = 0;
    for (const sub of subs) {
      const c = convertAmount(sub.amount, sub.currency, "EUR", TEST_RATES);
      if (c !== null) eurTotal += c;
    }

    // Totals should be different
    expect(roundMoney(inrTotal)).not.toBe(roundMoney(eurTotal));
    // But subscription amounts should remain unchanged
    expect(subs[0].amount).toBe(15);
    expect(subs[0].currency).toBe("USD");
    expect(subs[1].amount).toBe(11);
    expect(subs[1].currency).toBe("EUR");
  });
});

describe("Failure cases", () => {
  it("missing exchange rate returns null", () => {
    const rates = { USD: 1, EUR: 0.85 };
    // INR is not in rates
    expect(convertAmount(100, "INR", "EUR", rates)).toBeNull();
    expect(convertAmount(100, "USD", "INR", rates)).toBeNull();
  });

  it("empty rates object returns null for any conversion", () => {
    expect(convertAmount(100, "USD", "EUR", {})).toBeNull();
  });

  it("same currency still works with empty rates", () => {
    expect(convertAmount(100, "USD", "USD", {})).toBe(100);
  });
});
