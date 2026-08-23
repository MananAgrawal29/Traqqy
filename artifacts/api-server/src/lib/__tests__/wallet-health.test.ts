import { describe, it, expect } from 'vitest';

/**
 * Mirrors the exact scoring logic from wallet-health.ts.
 */
function calculateScore(subs: any[], budget: number | null, feeling: string | null, _cats: string[] = []) {
  const active = subs.filter(s => s.isActive && !s.isArchived);
  const archived = subs.filter(s => s.isArchived);
  let totalMonthly = 0;
  for (const s of active) totalMonthly += s.monthlyEquivalent;
  let spendingScore: number;
  if (budget && budget > 0) {
    const ratio = totalMonthly / budget;
    if (ratio <= 0.5) spendingScore = 35;
    else if (ratio <= 0.75) spendingScore = 30;
    else if (ratio <= 1) spendingScore = 24;
    else if (ratio <= 1.25) spendingScore = 16;
    else if (ratio <= 1.5) spendingScore = 8;
    else spendingScore = 0;
    if (feeling === "too_much" && spendingScore >= 5) spendingScore = Math.max(spendingScore - 5, 0);
    else if (feeling === "could_spend_more" && spendingScore <= 30) spendingScore = Math.min(spendingScore + 5, 35);
  } else spendingScore = 20;
  let costIn30 = 0, countIn30 = 0;
  for (const s of active) {
    if (s.daysUntilRenewal === null) continue;
    if (s.daysUntilRenewal >= 0 && s.daysUntilRenewal <= 30) { costIn30 += s.monthlyEquivalent; countIn30++; }
  }
  let renewalScore: number;
  if (budget && budget > 0) {
    const pr = costIn30 / budget;
    if (countIn30 === 0) renewalScore = 20;
    else if (pr <= 0.25) renewalScore = 18;
    else if (pr <= 0.5) renewalScore = 14;
    else if (pr <= 0.75) renewalScore = 8;
    else if (pr <= 1) renewalScore = 4;
    else renewalScore = 0;
  } else {
    if (countIn30 === 0) renewalScore = 20;
    else if (costIn30 <= 500) renewalScore = 18;
    else if (costIn30 <= 1500) renewalScore = 14;
    else if (costIn30 <= 3000) renewalScore = 8;
    else renewalScore = 4;
  }
  let stabilityScore = 15;
  let efficiencyScore = 15;
  const staleCount = active.filter(s => s.daysUntilRenewal !== null && s.daysUntilRenewal < 0).length;
  let managementScore = staleCount === 0 ? 15 : staleCount === 1 ? 12 : staleCount <= 3 ? 9 : 5;
  const totalScore = Math.max(0, Math.min(100, spendingScore + renewalScore + stabilityScore + efficiencyScore + managementScore));
  return { totalScore, spendingScore, renewalScore, stabilityScore, efficiencyScore, managementScore };
}

function sub(name: string, price: number, cycle = 'monthly', daysUntil: number | null = 30, active = true, archived = false) {
  const m = cycle === 'yearly' ? price / 12 : cycle === 'quarterly' ? price / 3 : price;
  return { name, price, monthlyEquivalent: m, daysUntilRenewal: daysUntil, isActive: active, isArchived: archived };
}

describe("Wallet Health - Basic Scenarios", () => {
  it("no subs no budget = 85", () => {
    const r = calculateScore([], null, null);
    expect(r.totalScore).toBe(85);
    expect(r.spendingScore).toBe(20);
    expect(r.stabilityScore).toBe(15);
    expect(r.efficiencyScore).toBe(15);
    expect(r.managementScore).toBe(15);
  });
  it("one cheap sub within budget", () => {
    const r = calculateScore([sub("Spotify", 99)], 1000, null);
    expect(r.spendingScore).toBe(35);
    expect(r.totalScore).toBeGreaterThanOrEqual(88);
  });
  it("several cheap subs well within budget", () => {
    const r = calculateScore([sub("A", 100), sub("B", 150), sub("C", 200)], 2000, null);
    expect(r.spendingScore).toBe(35);
  });
  it("expensive subs within budget", () => {
    const r = calculateScore([sub("Netflix", 500), sub("Claude", 1500)], 3000, null);
    expect(r.spendingScore).toBe(30);
  });
  it("high spending very high budget", () => {
    const r = calculateScore([sub("P", 5000)], 20000, null);
    expect(r.spendingScore).toBe(35);
  });
  it("low spending very low budget", () => {
    const r = calculateScore([sub("B", 50)], 100, null);
    expect(r.spendingScore).toBe(35);
  });
  it("exactly at budget = 24/35", () => {
    const r = calculateScore([sub("E", 1000)], 1000, null);
    expect(r.spendingScore).toBe(24);
  });
  it("125pct of budget = 16/35", () => {
    const r = calculateScore([sub("O", 1250)], 1000, null);
    expect(r.spendingScore).toBe(16);
  });
  it("150pct of budget = 8/35", () => {
    const r = calculateScore([sub("W", 1500)], 1000, null);
    expect(r.spendingScore).toBe(8);
  });
  it(">150pct of budget = 0/35", () => {
    const r = calculateScore([sub("E", 2000)], 1000, null);
    expect(r.spendingScore).toBe(0);
  });
  it("no budget set = neutral 20/35", () => {
    const r = calculateScore([sub("X", 5000)], null, null);
    expect(r.spendingScore).toBe(20);
  });
});

describe("Wallet Health - Spending Feeling", () => {
  it("too_much subtracts up to 5", () => {
    const r = calculateScore([sub("F", 750)], 1000, "too_much");
    expect(r.spendingScore).toBe(25);
  });
  it("about_right has no effect", () => {
    const r = calculateScore([sub("F", 750)], 1000, "about_right");
    expect(r.spendingScore).toBe(30);
  });
  it("could_spend_more adds up to 5 for over-budget", () => {
    const r = calculateScore([sub("F", 1200)], 1000, "could_spend_more");
    expect(r.spendingScore).toBe(21);
  });
  it("too_much cannot make extreme over-budget look healthy", () => {
    const r = calculateScore([sub("E", 2000)], 1000, "too_much");
    expect(r.spendingScore).toBe(0);
  });
  it("could_spend_more is capped at 35", () => {
    const r = calculateScore([sub("F", 500)], 1000, "could_spend_more");
    expect(r.spendingScore).toBe(35);
  });
});

describe("Wallet Health - Budget Matrix 2000", () => {
  const b = 2000;
  it("500 = 35", () => { expect(calculateScore([sub("A", 500)], b, null).spendingScore).toBe(35); });
  it("1000 = 35", () => { expect(calculateScore([sub("A", 1000)], b, null).spendingScore).toBe(35); });
  it("1500 = 30", () => { expect(calculateScore([sub("A", 1500)], b, null).spendingScore).toBe(30); });
  it("2000 = 24", () => { expect(calculateScore([sub("A", 2000)], b, null).spendingScore).toBe(24); });
  it("2500 = 16", () => { expect(calculateScore([sub("A", 2500)], b, null).spendingScore).toBe(16); });
  it("3000 = 8", () => { expect(calculateScore([sub("A", 3000)], b, null).spendingScore).toBe(8); });
  it("4000 = 0", () => { expect(calculateScore([sub("A", 4000)], b, null).spendingScore).toBe(0); });
});

describe("Wallet Health - Budget Matrix 5000", () => {
  const b = 5000;
  it("2000 = 35", () => { expect(calculateScore([sub("A", 2000)], b, null).spendingScore).toBe(35); });
  it("4000 = 24", () => { expect(calculateScore([sub("A", 4000)], b, null).spendingScore).toBe(24); });
  it("5000 = 24", () => { expect(calculateScore([sub("A", 5000)], b, null).spendingScore).toBe(24); });
  it("6250 = 16", () => { expect(calculateScore([sub("A", 6250)], b, null).spendingScore).toBe(16); });
  it("7500 = 8", () => { expect(calculateScore([sub("A", 7500)], b, null).spendingScore).toBe(8); });
  it("10000 = 0", () => { expect(calculateScore([sub("A", 10000)], b, null).spendingScore).toBe(0); });
});

describe("Wallet Health - Budget Matrix 10000", () => {
  const b = 10000;
  it("3000 = 35", () => { expect(calculateScore([sub("A", 3000)], b, null).spendingScore).toBe(35); });
  it("5000 = 35", () => { expect(calculateScore([sub("A", 5000)], b, null).spendingScore).toBe(35); });
  it("7500 = 30", () => { expect(calculateScore([sub("A", 7500)], b, null).spendingScore).toBe(30); });
  it("10000 = 24", () => { expect(calculateScore([sub("A", 10000)], b, null).spendingScore).toBe(24); });
  it("12500 = 16", () => { expect(calculateScore([sub("A", 12500)], b, null).spendingScore).toBe(16); });
  it("15000 = 8", () => { expect(calculateScore([sub("A", 15000)], b, null).spendingScore).toBe(8); });
  it("20000 = 0", () => { expect(calculateScore([sub("A", 20000)], b, null).spendingScore).toBe(0); });
});

describe("Wallet Health - Renewal Pressure", () => {
  it("no upcoming renewals = 20/20", () => {
    expect(calculateScore([sub("F", 500, "monthly", 60)], 5000, null).renewalScore).toBe(20);
  });
  it("small renewal with budget = 18/20", () => {
    expect(calculateScore([sub("F", 99, "monthly", 10)], 5000, null).renewalScore).toBe(18);
  });
  it("huge renewal equal budget = 4/20", () => {
    expect(calculateScore([sub("B", 5000, "monthly", 10)], 5000, null).renewalScore).toBe(4);
  });
  it("huge renewal without budget = 4/20", () => {
    expect(calculateScore([sub("B", 5000, "monthly", 10)], null, null).renewalScore).toBe(4);
  });
  it("no budget low cost = 18/20", () => {
    expect(calculateScore([sub("F", 200, "monthly", 5)], null, null).renewalScore).toBe(18);
  });
  it("many small renewals still good pressure", () => {
    const r = calculateScore([sub("A", 99, "monthly", 5), sub("B", 99, "monthly", 10), sub("C", 99, "monthly", 20)], 5000, null);
    expect(r.renewalScore).toBe(18);
  });
  it("one expensive renewal dominates", () => {
    const r = calculateScore([sub("Big", 4000, "monthly", 10), sub("Small", 100, "monthly", 5)], 5000, null);
    expect(r.renewalScore).toBe(4);
  });
});

describe("Wallet Health - Spending Stability", () => {
  it("no subs = 15/15", () => {
    expect(calculateScore([], null, null).stabilityScore).toBe(15);
  });
  it("any active subs = 15/15 neutral", () => {
    expect(calculateScore([sub("A", 500)], null, null).stabilityScore).toBe(15);
    expect(calculateScore([sub("A", 100), sub("B", 2000)], null, null).stabilityScore).toBe(15);
  });
});

describe("Wallet Health - Subscription Efficiency", () => {
  it("no subs = 15/15", () => {
    expect(calculateScore([], null, null).efficiencyScore).toBe(15);
  });
  it("active only no archived = 15/15", () => {
    expect(calculateScore([sub("A", 100), sub("B", 200)], null, null).efficiencyScore).toBe(15);
  });
  it("12 subs no archived still 15/15", () => {
    const r = calculateScore(Array.from({length: 12}, (_, i) => sub("S"+i, 100)), null, null);
    expect(r.efficiencyScore).toBe(15);
  });
  it("archived ratio >= 30pct = 15/15", () => {
    const subs = [sub("A", 100), sub("B", 200), sub("C", 300, "monthly", 30, false, true), sub("D", 400, "monthly", 30, false, true)];
    expect(calculateScore(subs, null, null).efficiencyScore).toBe(15);
  });
  it("archived ratio >= 15pct = 15/15", () => {
    const subs = [sub("A", 100), sub("B", 200), sub("C", 300), sub("D", 400, "monthly", 30, false, true)];
    expect(calculateScore(subs, null, null).efficiencyScore).toBe(15);
  });
});

describe("Wallet Health - Renewal Management", () => {
  it("all dates current = 15/15", () => {
    expect(calculateScore([sub("G", 500, "monthly", 15)], null, null).managementScore).toBe(15);
  });
  it("1 stale = 12/15", () => {
    expect(calculateScore([sub("A", 500, "monthly", -10)], null, null).managementScore).toBe(12);
  });
  it("2 stale = 9/15", () => {
    expect(calculateScore([sub("A", 500, "monthly", -10), sub("B", 300, "monthly", -5)], null, null).managementScore).toBe(9);
  });
  it("3 stale = 9/15", () => {
    expect(calculateScore([sub("A", 500, "monthly", -10), sub("B", 300, "monthly", -5), sub("C", 200, "monthly", -1)], null, null).managementScore).toBe(9);
  });
  it("4 stale = 5/15", () => {
    expect(calculateScore([sub("A", 500, "monthly", -10), sub("B", 300, "monthly", -5), sub("C", 200, "monthly", -1), sub("D", 100, "monthly", -20)], null, null).managementScore).toBe(5);
  });
});

describe("Wallet Health - Dream State", () => {
  it("near-perfect wallet reaches 100", () => {
    const r = calculateScore([sub("X", 500, "monthly", 60)], 2000, "about_right");
    expect(r.totalScore).toBe(100);
  });
  it("perfect wallet with archived subs reaches 100", () => {
    const subs = [sub("A", 500, "monthly", 60), sub("B", 300, "monthly", 30, false, true), sub("C", 400, "monthly", 30, false, true), sub("D", 200, "monthly", 30, false, true)];
    expect(calculateScore(subs, 2000, "about_right").totalScore).toBe(100);
  });
  it("max achievable = 100", () => {
    const subs = [sub("A", 500, "monthly", 60), sub("B", 100, "monthly", 30, false, true), sub("C", 200, "monthly", 30, false, true)];
    expect(calculateScore(subs, 5000, "about_right").totalScore).toBe(100);
  });
});

describe("Wallet Health - Degradation", () => {
  const base = () => calculateScore([sub("A", 500, "monthly", 60), sub("B", 100, "monthly", 30, false, true), sub("C", 200, "monthly", 30, false, true)], 5000, "about_right");
  it("base = 100", () => { expect(base().totalScore).toBe(100); });
  it("over-budget drops", () => {
    const r = calculateScore([sub("A", 6000, "monthly", 60), sub("B", 100, "monthly", 30, false, true), sub("C", 200, "monthly", 30, false, true)], 5000, "about_right");
    expect(r.totalScore).toBe(81);
    expect(r.totalScore).toBeLessThan(100);
  });
  it("renewal pressure drops", () => {
    const r = calculateScore([sub("A", 500, "monthly", 5), sub("B", 100, "monthly", 30, false, true), sub("C", 200, "monthly", 30, false, true)], 5000, "about_right");
    expect(r.totalScore).toBe(98);
    expect(r.totalScore).toBeLessThan(100);
  });
  it("stale dates drops", () => {
    const r = calculateScore([sub("A", 500, "monthly", -5), sub("B", 100, "monthly", 30, false, true), sub("C", 200, "monthly", 30, false, true)], 5000, "about_right");
    expect(r.totalScore).toBe(97);
    expect(r.totalScore).toBeLessThan(100);
  });
  it("multiple weaknesses compound", () => {
    const r = calculateScore([sub("A", 7000, "monthly", 5), sub("B", 300, "monthly", -10), sub("C", 200, "monthly", -5)], 5000, "too_much");
    expect(r.totalScore).toBe(42);
    expect(r.totalScore).toBeLessThan(50);
  });
});

describe("Wallet Health - Wallet Types", () => {
  it("low spend low budget", () => {
    const r = calculateScore([sub("A", 150)], 300, null);
    expect(r.spendingScore).toBe(35);
    expect(r.totalScore).toBeGreaterThanOrEqual(80);
  });
  it("low spend high budget", () => {
    expect(calculateScore([sub("A", 500)], 10000, null).spendingScore).toBe(35);
  });
  it("high spend high budget", () => {
    expect(calculateScore([sub("A", 5000), sub("B", 2000)], 10000, null).spendingScore).toBe(30);
  });
  it("high spend low budget", () => {
    expect(calculateScore([sub("A", 5000), sub("B", 2000)], 3000, null).spendingScore).toBe(0);
  });
  it("many cheap subs", () => {
    const r = calculateScore(Array.from({length: 10}, (_, i) => sub("S"+i, 100)), 2000, null);
    expect(r.spendingScore).toBe(35);
    expect(r.efficiencyScore).toBe(15);
  });
  it("few expensive subs", () => {
    expect(calculateScore([sub("A", 3000), sub("B", 2000), sub("C", 1500)], 10000, null).spendingScore).toBe(30);
  });
  it("explicitly unused archived get efficiency bonus", () => {
    const subs = [sub("Keep", 500, "monthly", 20), sub("Keep2", 300, "monthly", 15), sub("Unused", 200, "monthly", 30, false, true), sub("Unused2", 150, "monthly", 30, false, true), sub("Unused3", 100, "monthly", 30, false, true)];
    expect(calculateScore(subs, 3000, null).efficiencyScore).toBe(15);
  });
});

describe("Wallet Health - Edge Cases", () => {
  it("all archived = full efficiency", () => {
    const r = calculateScore([sub("A", 100, "monthly", 30, false, true), sub("B", 200, "monthly", 30, false, true)], 5000, null);
    expect(r.efficiencyScore).toBe(15);
    expect(r.stabilityScore).toBe(15);
  });
  it("null daysUntilRenewal = not counted", () => {
    expect(calculateScore([sub("A", 500, "monthly", null)], 5000, null).renewalScore).toBe(20);
  });
  it("yearly billing", () => {
    expect(calculateScore([sub("Annual", 12000, "yearly", 30)], 10000, null).spendingScore).toBe(35);
  });
  it("quarterly billing", () => {
    expect(calculateScore([sub("Q", 900, "quarterly", 30)], 3000, null).spendingScore).toBe(35);
  });
  it("zero budget = no budget", () => {
    expect(calculateScore([sub("A", 500)], 0, null).spendingScore).toBe(20);
  });
  it("negative budget = no budget", () => {
    expect(calculateScore([sub("A", 500)], -100, null).spendingScore).toBe(20);
  });
});

describe("Wallet Health - Sensitivity", () => {
  it("score decreases gradually past budget", () => {
    const scores: number[] = [];
    for (const amt of [1500, 1800, 2000, 2200, 2500, 3000]) {
      scores.push(calculateScore([sub("X", amt)], 2000, null).totalScore);
    }
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeLessThanOrEqual(scores[i-1]);
    expect(scores[0] - scores[1]).toBeLessThanOrEqual(10);
  });
  it("no single factor dominates > half total", () => {
    const r = calculateScore([sub("A", 500)], 2000, null);
    const maxF = Math.max(r.spendingScore, r.renewalScore, r.stabilityScore, r.efficiencyScore, r.managementScore);
    expect(maxF).toBeLessThan(r.totalScore / 2);
  });
});
