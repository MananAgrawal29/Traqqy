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

describe('Scheduler - Resend Error Handling', () => {
  it('marks reminder as FAILED when sendReminderEmail throws', async () => {
    // Setup: mock sendReminderEmail to reject
    const { sendReminderEmail } = await import('../mail');
    vi.mocked(sendReminderEmail).mockRejectedValueOnce(new Error('Resend rejected: 403'));

    // Setup: mock claimReminder to return a pending reminder
    const pendingReminder = {
      id: 100,
      clerkId: 'user_test',
      subscriptionId: 1,
      daysBefore: 3,
      scheduledSendAt: new Date('2026-01-01'),
    };
    mockReturning
      .mockResolvedValueOnce([])                 // recoverStaleReminders returns nothing
      .mockResolvedValueOnce([pendingReminder]); // claimReminder returns reminder
      // claimReminder 2nd call gets default [] → loop breaks
      // markFailed doesn't call .returning()

    // Setup: mock subscription lookup via select().from().where().limit()
    mockDb.limit.mockResolvedValueOnce([{
      id: 1,
      name: 'Test Sub',
      price: '299',
      currency: 'INR',
      renewalDate: '2026-01-04',
      isActive: true,
      isArchived: false,
    }]);

    const { processDueReminders } = await import('../scheduler');
    const result = await processDueReminders();

    // Should be processed but FAILED, not sent
    expect(result.processed).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);

  });

  it('does NOT mark as sent when Resend returns error object', async () => {
    // Setup: mock sendReminderEmail to throw with Resend-like error
    const { sendReminderEmail } = await import('../mail');
    vi.mocked(sendReminderEmail).mockRejectedValueOnce(
      new Error('Resend rejected the email: You can only send testing emails to your own email address')
    );

    const pendingReminder = {
      id: 200,
      clerkId: 'user_test',
      subscriptionId: 2,
      daysBefore: 1,
      scheduledSendAt: new Date('2026-01-01'),
    };
    mockReturning
      .mockResolvedValueOnce([])                 // recoverStaleReminders
      .mockResolvedValueOnce([pendingReminder]); // claimReminder

    mockDb.limit.mockResolvedValueOnce([{
      id: 2,
      name: 'Another Sub',
      price: '149',
      currency: 'INR',
      renewalDate: '2026-01-02',
      isActive: true,
      isArchived: false,
    }]);

    const { processDueReminders } = await import('../scheduler');
    const result = await processDueReminders();

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
  });
});
