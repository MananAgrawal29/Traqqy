import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
const mockFindFirst = vi.fn();
const mockDb = {
  query: {
    userSettingsTable: { findFirst: mockFindFirst },
  },
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
};

vi.mock("@workspace/db", () => ({
  db: mockDb,
  remindersTable: {},
  subscriptionsTable: {},
  userSettingsTable: {},
}));

describe("calculateScheduledSendAt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Asia/Kolkata: 09:00 IST = 03:30 UTC", async () => {
    mockFindFirst.mockResolvedValue({ timezone: "Asia/Kolkata" });
    const { calculateScheduledSendAt } = await import("../scheduling");

    // Renewal: 2026-09-15, daysBefore: 3 → reminder date: 2026-09-12
    // 09:00 IST on Sep 12 = 03:30 UTC on Sep 12
    const result = await calculateScheduledSendAt("user1", "2026-09-15", 3);
    expect(result).not.toBeNull();
    const utc = result!.toISOString();
    expect(utc).toBe("2026-09-12T03:30:00.000Z");
  });

  it("America/New_York: 09:00 EDT = 13:00 UTC", async () => {
    mockFindFirst.mockResolvedValue({ timezone: "America/New_York" });
    const { calculateScheduledSendAt } = await import("../scheduling");

    // Renewal: 2026-09-15, daysBefore: 3 → reminder date: 2026-09-12
    // Sep 12 is during EDT (UTC-4)
    // 09:00 EDT = 13:00 UTC
    const result = await calculateScheduledSendAt("user1", "2026-09-15", 3);
    expect(result).not.toBeNull();
    const utc = result!.toISOString();
    expect(utc).toBe("2026-09-12T13:00:00.000Z");
  });

  it("UTC: 09:00 UTC = 09:00 UTC", async () => {
    mockFindFirst.mockResolvedValue({ timezone: "UTC" });
    const { calculateScheduledSendAt } = await import("../scheduling");

    const result = await calculateScheduledSendAt("user1", "2026-09-15", 3);
    expect(result).not.toBeNull();
    const utc = result!.toISOString();
    expect(utc).toBe("2026-09-12T09:00:00.000Z");
  });

  it("America/New_York winter (EST): 09:00 EST = 14:00 UTC", async () => {
    mockFindFirst.mockResolvedValue({ timezone: "America/New_York" });
    const { calculateScheduledSendAt } = await import("../scheduling");

    // Renewal: 2026-01-15, daysBefore: 3 → reminder date: 2026-01-12
    // Jan 12 is during EST (UTC-5)
    // 09:00 EST = 14:00 UTC
    const result = await calculateScheduledSendAt("user1", "2026-01-15", 3);
    expect(result).not.toBeNull();
    const utc = result!.toISOString();
    expect(utc).toBe("2026-01-12T14:00:00.000Z");
  });

  it("Month boundary: renewal on 2026-10-01, daysBefore=5 → Sep 26", async () => {
    mockFindFirst.mockResolvedValue({ timezone: "Asia/Kolkata" });
    const { calculateScheduledSendAt } = await import("../scheduling");

    // Renewal: 2026-10-01, daysBefore: 5 → reminder date: 2026-09-26
    // 09:00 IST on Sep 26 = 03:30 UTC on Sep 26
    const result = await calculateScheduledSendAt("user1", "2026-10-01", 5);
    expect(result).not.toBeNull();
    const utc = result!.toISOString();
    expect(utc).toBe("2026-09-26T03:30:00.000Z");
  });

  it("Year boundary: renewal on 2027-01-02, daysBefore=5 → 2026-12-28", async () => {
    mockFindFirst.mockResolvedValue({ timezone: "UTC" });
    const { calculateScheduledSendAt } = await import("../scheduling");

    // Renewal: 2027-01-02, daysBefore: 5 → reminder date: 2026-12-28
    const result = await calculateScheduledSendAt("user1", "2027-01-02", 5);
    expect(result).not.toBeNull();
    const utc = result!.toISOString();
    expect(utc).toBe("2026-12-28T09:00:00.000Z");
  });

  it("Defaults to UTC when no timezone is configured", async () => {
    mockFindFirst.mockResolvedValue(null);
    const { calculateScheduledSendAt } = await import("../scheduling");

    const result = await calculateScheduledSendAt("user1", "2026-09-15", 3);
    expect(result).not.toBeNull();
    const utc = result!.toISOString();
    expect(utc).toBe("2026-09-12T09:00:00.000Z");
  });
});

describe("daysUntilRenewal", () => {
  it("returns 0 for today's date", async () => {
    const { daysUntilRenewal } = await import("../scheduling");
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]!;
    expect(daysUntilRenewal(todayStr)).toBe(0);
  });

  it("returns positive for future date", async () => {
    const { daysUntilRenewal } = await import("../scheduling");
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 7);
    const futureStr = future.toISOString().split("T")[0]!;
    expect(daysUntilRenewal(futureStr)).toBe(7);
  });

  it("returns negative for past date", async () => {
    const { daysUntilRenewal } = await import("../scheduling");
    const past = new Date();
    past.setUTCDate(past.getUTCDate() - 3);
    const pastStr = past.toISOString().split("T")[0]!;
    expect(daysUntilRenewal(pastStr)).toBe(-3);
  });

  it("does not shift by one day near midnight UTC", async () => {
    const { daysUntilRenewal } = await import("../scheduling");
    // A date exactly 1 day in the future should return 1
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0]!;
    expect(daysUntilRenewal(tomorrowStr)).toBe(1);
  });
});
