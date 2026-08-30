import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable, userSettingsTable, categoriesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";
import { getOrFetchRates } from "../lib/fx-cache";
import { convertAmount, roundMoney } from "@workspace/currencies/convert";
import { calcEquivalents, daysUntil } from "../lib/billing";
import type { BillingCycle } from "../lib/billing";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const [subs, settingsRow, categories] = await Promise.all([
      db.select().from(subscriptionsTable).where(eq(subscriptionsTable.clerkId, userId)),
      db.query.userSettingsTable.findFirst({ where: eq(userSettingsTable.clerkId, userId) }),
      db.select().from(categoriesTable),
    ]);

    let prefs: any = null;
    if (settingsRow?.healthPreferences) {
      try { prefs = JSON.parse(settingsRow.healthPreferences as string); } catch {}
    }
    const budget: number | null = prefs?.monthlyBudget || null;
    const userCurrency: string = settingsRow?.currency || "USD";
    const feeling: string | null = prefs?.spendingFeeling || null;
    const priorityCategories: string[] = prefs?.priorityCategories || [];

    const categoryMap = new Map<number, string>();
    for (const cat of categories) categoryMap.set(cat.id, cat.name);

    const active: any[] = [];
    const archived: any[] = [];
    let totalMonthly = 0;

    for (const sub of subs) {
      const { monthlyEquivalent } = calcEquivalents(parseFloat(sub.price), sub.billingCycle as BillingCycle);
      const days = sub.subscriptionType === "lifetime" ? null : (sub.renewalDate ? daysUntil(sub.renewalDate) : null);
      const entry = { ...sub, price: parseFloat(sub.price), monthlyEquivalent, daysUntilRenewal: days,
        categoryName: sub.categoryId ? categoryMap.get(sub.categoryId) : undefined };
      if (sub.isActive && !sub.isArchived) { active.push(entry); totalMonthly += monthlyEquivalent; }
      else if (sub.isArchived) archived.push(entry);
    }

    // NO SUBSCRIPTIONS: return special response
    if (active.length === 0 && archived.length === 0) {
      res.json({
        score: null, status: "no_data",
        factors: [],
        recommendations: [{ id: "add_sub", title: "Add a subscription", description: "Add your first subscription to start building your Wallet Health.", impact: "medium", link: "/subscriptions" }],
        summary: { monthlySpend: 0, yearlySpend: 0, activeCount: 0, renewalIn7Days: 0, renewalIn30Days: 0, costIn30Days: 0, averagePerSubscription: 0, budget, spendingVsBudget: null, defaultCurrency: userCurrency, conversionAvailable: true },
      });
      return;
    }

    // Convert totalMonthly to default currency
    const allSubItems = active.map(s => ({ amount: s.monthlyEquivalent, currency: s.currency || "USD" }));
    let convertedMonthly = totalMonthly;
    let conversionAvailable = true;
    const defaultCurrency = userCurrency;
    if (allSubItems.length > 0 && !allSubItems.every(i => i.currency === defaultCurrency)) {
      const rates = await getOrFetchRates(db);
      if (rates) {
        convertedMonthly = 0;
        for (const item of allSubItems) {
          const c = convertAmount(item.amount, item.currency, defaultCurrency, rates);
          if (c === null) { conversionAvailable = false; convertedMonthly += item.amount; }
          else { convertedMonthly += c; }
        }
      } else {
        conversionAvailable = false;
      }
    }
    convertedMonthly = roundMoney(convertedMonthly);

    // Also convert costIn30/costIn7
    const renewItems30 = active.filter(s => s.daysUntilRenewal !== null && s.daysUntilRenewal >= 0 && s.daysUntilRenewal <= 30).map(s => ({ amount: s.monthlyEquivalent, currency: s.currency || "USD" }));
    const renewItems7 = active.filter(s => s.daysUntilRenewal !== null && s.daysUntilRenewal >= 0 && s.daysUntilRenewal <= 7).map(s => ({ amount: s.monthlyEquivalent, currency: s.currency || "USD" }));
    
    let convertedCostIn30 = 0, convertedCostIn7 = 0;
    if (renewItems30.length > 0 && !renewItems30.every(i => i.currency === defaultCurrency)) {
      const rates = await getOrFetchRates(db);
      if (rates) {
        for (const item of renewItems30) { const c = convertAmount(item.amount, item.currency, defaultCurrency, rates); convertedCostIn30 += c ?? item.amount; }
        for (const item of renewItems7) { const c = convertAmount(item.amount, item.currency, defaultCurrency, rates); convertedCostIn7 += c ?? item.amount; }
      } else {
        convertedCostIn30 = renewItems30.reduce((s,i) => s + i.amount, 0);
        convertedCostIn7 = renewItems7.reduce((s,i) => s + i.amount, 0);
      }
    } else {
      convertedCostIn30 = renewItems30.reduce((s,i) => s + i.amount, 0);
      convertedCostIn7 = renewItems7.reduce((s,i) => s + i.amount, 0);
    }
    convertedCostIn30 = roundMoney(convertedCostIn30);
    convertedCostIn7 = roundMoney(convertedCostIn7);

    // FACTOR 1: SPENDING HEALTH (35 points)
    // Measures: monthly spend relative to user's own budget
    let spendingScore: number; let spendingDescription: string;
    if (budget && budget > 0) {
      const ratio = convertedMonthly / budget;
      if (ratio <= 0.5) { spendingScore = 35; spendingDescription = "Well within your budget at " + Math.round(ratio*100) + "%."; }
      else if (ratio <= 0.75) { spendingScore = 30; spendingDescription = "At " + Math.round(ratio*100) + "% of your budget. On track."; }
      else if (ratio <= 1) { spendingScore = 24; spendingDescription = "At " + Math.round(ratio*100) + "% of your budget. Approaching limit."; }
      else if (ratio <= 1.25) { spendingScore = 16; spendingDescription = "Over budget by " + Math.round((ratio-1)*100) + "%."; }
      else if (ratio <= 1.5) { spendingScore = 8; spendingDescription = "Significantly over budget at " + Math.round(ratio*100) + "%."; }
      else { spendingScore = 0; spendingDescription = "Spending is " + Math.round(ratio*100) + "% of your budget."; }
      // Calibration: spending feeling adjusts by up to +/-5
      if (feeling === "too_much" && spendingScore >= 5) spendingScore = Math.max(spendingScore - 5, 0);
      else if (feeling === "could_spend_more" && spendingScore <= 30) spendingScore = Math.min(spendingScore + 5, 35);
    } else {
      // No budget: neutral default
      spendingScore = 20;
      spendingDescription = "Set a monthly budget for a personalized score.";
    }

    // FACTOR 2: RENEWAL PRESSURE (20 points)
    // Measures: upcoming renewal cost relative to budget or absolute thresholds
    let renewalScore: number; let renewalDescription: string;
    let countIn7 = 0, countIn30 = 0;
    for (const s of active) {
      if (s.daysUntilRenewal === null) continue;
      if (s.daysUntilRenewal >= 0 && s.daysUntilRenewal <= 7) { countIn7++; }
      if (s.daysUntilRenewal >= 0 && s.daysUntilRenewal <= 30) { countIn30++; }
    }
    if (budget && budget > 0) {
      const pr = convertedCostIn30 / budget;
      if (countIn30 === 0) { renewalScore = 20; renewalDescription = "No renewals due in 30 days."; }
      else if (pr <= 0.25) { renewalScore = 18; renewalDescription = "Low renewal pressure. " + Math.round(convertedCostIn30) + " " + userCurrency + " due in 30 days."; }
      else if (pr <= 0.5) { renewalScore = 14; renewalDescription = "Moderate renewal pressure. " + Math.round(convertedCostIn30) + " " + userCurrency + " due in 30 days."; }
      else if (pr <= 0.75) { renewalScore = 8; renewalDescription = "Significant renewal concentration. " + Math.round(convertedCostIn30) + " " + userCurrency + " due."; }
      else if (pr <= 1) { renewalScore = 4; renewalDescription = "High pressure. " + Math.round(convertedCostIn30) + " " + userCurrency + " due vs " + "" + budget + " " + userCurrency + " budget."; }
      else { renewalScore = 0; renewalDescription = "Upcoming renewals exceed your budget."; }
    } else {
      if (countIn30 === 0) { renewalScore = 20; renewalDescription = "No renewals due in 30 days."; }
      else if (convertedCostIn30 <= 500) { renewalScore = 18; renewalDescription = "Low renewal pressure."; }
      else if (convertedCostIn30 <= 1500) { renewalScore = 14; renewalDescription = "Moderate renewal pressure."; }
      else if (convertedCostIn30 <= 3000) { renewalScore = 8; renewalDescription = "Significant concentration."; }
      else { renewalScore = 4; renewalDescription = "High renewal pressure."; }
    }

    // FACTOR 3: SPENDING STABILITY (15 points)
    // Without historical spending data, use neutral default
    // Price variation across subscriptions is NOT stability
    let stabilityScore: number; let stabilityDescription: string;
    if (active.length === 0) {
      stabilityScore = 15; stabilityDescription = "No active subscriptions.";
    } else {
      // Neutral: we cannot measure genuine spending stability without historical data
      // This prevents penalizing users whose subscriptions have different prices
      stabilityScore = 15;
      stabilityDescription = "Not enough history yet to evaluate spending changes.";
    }

    // FACTOR 4: SUBSCRIPTION EFFICIENCY (15 points)
    // Only uses actual evidence: archived subscriptions
    // Does NOT penalize for having many subscriptions
    let efficiencyScore: number; let efficiencyDescription: string;
    if (active.length === 0) {
      efficiencyScore = 15; efficiencyDescription = "No active subscriptions.";
    } else {
      efficiencyScore = 15;
      efficiencyDescription = "Not enough data yet to evaluate subscription efficiency.";
    }

    // FACTOR 5: RENEWAL MANAGEMENT (15 points)
    // Treats past renewal dates as data-quality issues, not payment failures
    let managementScore: number; let managementDescription: string;
    const staleCount = active.filter(s => s.daysUntilRenewal !== null && s.daysUntilRenewal < 0).length;
    if (staleCount === 0) {
      managementScore = 15; managementDescription = "All renewal dates are current.";
    } else if (staleCount === 1) {
      managementScore = 12; managementDescription = "1 renewal date needs updating.";
    } else if (staleCount <= 3) {
      managementScore = 9; managementDescription = staleCount + " renewal dates need updating.";
    } else {
      managementScore = 5; managementDescription = staleCount + " renewal dates need updating. Keeping these current improves your score.";
    }

    // TOTAL SCORE
    const totalScore = Math.max(0, Math.min(100, spendingScore + renewalScore + stabilityScore + efficiencyScore + managementScore));
    const status = totalScore >= 90 ? "excellent" : totalScore >= 75 ? "healthy" : totalScore >= 50 ? "needs_attention" : totalScore >= 25 ? "unhealthy" : "critical";

    const factors = [
      { id: "spending_health", label: "Spending Health", score: spendingScore, maxScore: 35, description: spendingDescription },
      { id: "renewal_pressure", label: "Renewal Pressure", score: renewalScore, maxScore: 20, description: renewalDescription },
      { id: "spending_stability", label: "Spending Stability", score: stabilityScore, maxScore: 15, description: stabilityDescription },
      { id: "subscription_efficiency", label: "Subscription Efficiency", score: efficiencyScore, maxScore: 15, description: efficiencyDescription },
      { id: "renewal_management", label: "Renewal Management", score: managementScore, maxScore: 15, description: managementDescription },
    ];

    // RECOMMENDATIONS
    const recs: any[] = [];
    if (!budget) recs.push({ id: "set_budget", title: "Set a monthly budget", description: "Adding a budget makes your Health score personalized and meaningful.", impact: "medium" });      else if (convertedMonthly > budget) recs.push({ id: "over_budget", title: "You are over your budget", description: "Spending " + Math.round(convertedMonthly) + " " + userCurrency + "/month vs " + budget + " " + userCurrency + "/month budget.", impact: "high", link: "/subscriptions" });
    if (feeling === "too_much" && spendingScore >= 24) recs.push({ id: "feeling_ok", title: "Your spending is within budget", description: "You mentioned wanting to reduce spending, but you are within budget.", impact: "low", link: "/subscriptions" });
    if (countIn7 > 0) {
      const next = active.filter(s => s.daysUntilRenewal !== null && s.daysUntilRenewal >= 0 && s.daysUntilRenewal <= 7).sort((a,b) => a.daysUntilRenewal - b.daysUntilRenewal);
      if (next.length > 0) recs.push({ id: "upcoming", title: next[0].name + " renews in " + next[0].daysUntilRenewal + " days", description: next[0].price.toFixed(0) + " " + next[0].currency + " will be charged soon.", impact: "medium", link: "/calendar" });
    }
    if (staleCount > 0) recs.push({ id: "update_dates", title: "Update " + staleCount + " renewal date" + (staleCount > 1 ? "s" : ""), description: "Past renewal dates can be updated to keep tracking accurate.", impact: "medium", link: "/subscriptions" });
    if (priorityCategories.length > 0 && active.length > 0) {
      const nonPri = active.filter(s => s.categoryName && !priorityCategories.includes(s.categoryName));
      const nonPriItems = nonPri.map(s => ({ amount: s.monthlyEquivalent, currency: s.currency || "USD" }));
      const nonPriRates = nonPriItems.some(i => i.currency !== userCurrency) ? await getOrFetchRates(db) : null;
      let nonPriMonthly = 0;
      if (nonPriItems.length > 0) {
        if (!nonPriItems.every(i => i.currency === userCurrency) && nonPriRates) {
          for (const item of nonPriItems) {
            const c = convertAmount(item.amount, item.currency, userCurrency, nonPriRates);
            nonPriMonthly += c ?? item.amount;
          }
        } else {
          nonPriMonthly = nonPriItems.reduce((sum, i) => sum + i.amount, 0);
        }
      }
      if (nonPriMonthly > 0 && nonPriMonthly > convertedMonthly * 0.2) {
        const names = [...new Set(nonPri.map(s => s.categoryName).filter(Boolean))].join(", ");
        recs.push({ id: "non_priority", title: "Review non-priority spending", description: Math.round(nonPriMonthly) + " " + userCurrency + "/month goes to " + names + ", which you did not mark as a priority.", impact: "medium", link: "/subscriptions" });
      }
    }

    res.json({
      score: totalScore, status, factors, recommendations: recs,
      summary: {
        monthlySpend: convertedMonthly,
        yearlySpend: roundMoney(convertedMonthly * 12),
        activeCount: active.length,
        renewalIn7Days: countIn7, renewalIn30Days: countIn30,
        costIn30Days: convertedCostIn30,
        averagePerSubscription: active.length > 0 ? roundMoney(convertedMonthly / active.length) : 0,
        budget,
        defaultCurrency,
        conversionAvailable,
        spendingVsBudget: budget && budget > 0 ? Math.round((convertedMonthly / budget) * 100) : null,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compute wallet health");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
