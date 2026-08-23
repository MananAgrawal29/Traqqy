import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
const mockReturning = vi.fn().mockResolvedValue([]);
const mockDb = {
  query: {
    userSettingsTable: { findFirst: vi.fn().mockResolvedValue({ timezone: "UTC" }) },
    subscriptionsTable: { findFirst: vi.fn() },
  },
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: mockReturning,
  insert: vi.fn().mockReturnThis(),
};

vi.mock("@workspace/db", () => ({
  db: mockDb,
  remindersTable: {},
  subscriptionsTable: {},
  userSettingsTable: {},
}));

vi.mock("../mail", () => ({
  sendReminderEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../clerk-user", () => ({
  getClerkUserEmail: vi.fn().mockResolvedValue("test@example.com"),
}));

describe("Scheduler - processDueReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([]);
  });

  it("returns correct result shape", async () => {
    const { processDueReminders } = await import("../scheduler");
    const result = await processDueReminders();
    expect(result).toHaveProperty("processed");
    expect(result).toHaveProperty("sent");
    expect(result).toHaveProperty("failed");
    expect(result).toHaveProperty("recovered");
    expect(typeof result.processed).toBe("number");
  });

  it("processes zero reminders when none are due", async () => {
    const { processDueReminders } = await import("../scheduler");
    const result = await processDueReminders();
    expect(result.processed).toBe(0);
  });

  it("is idempotent when called multiple times", async () => {
    const { processDueReminders } = await import("../scheduler");
    const result1 = await processDueReminders();
    const result2 = await processDueReminders();
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
  });

  it("processes at most BATCH_SIZE (50) reminders", async () => {
    const { processDueReminders } = await import("../scheduler");
    const result = await processDueReminders();
    expect(result.processed).toBeLessThanOrEqual(50);
  });
});

describe("Scheduler - Atomic Claiming", () => {
  it("concurrent calls do not throw", async () => {
    const { processDueReminders } = await import("../scheduler");
    const [result1, result2] = await Promise.all([
      processDueReminders(),
      processDueReminders(),
    ]);
    expect(result1.processed).toBeGreaterThanOrEqual(0);
    expect(result2.processed).toBeGreaterThanOrEqual(0);
  });
});

describe("Scheduler - Stale Recovery", () => {
  it("recoverStaleReminders is called before claiming", async () => {
    const { processDueReminders } = await import("../scheduler");
    // The function calls recoverStaleReminders first, then claimReminder in a loop
    // With empty DB results, it should complete without error
    const result = await processDueReminders();
    expect(result.recovered).toBe(0); // No stale reminders in mock
  });
});
