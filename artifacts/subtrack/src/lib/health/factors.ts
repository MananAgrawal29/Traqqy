import type { HealthInput, HealthFactor, HealthRecommendation } from "./types";
import { calcEquivalents, daysUntil } from "@/lib/billing";

export function spendingLoadFactor(input: HealthInput): HealthFactor {
  const active = input.subscriptions.filter(s => s.isActive && !s.isArchived);
  let totalMonthly = 0;
  for (const sub of active) {
    const { monthlyEquivalent } = calcEquivalents(parseFloat(sub.price), sub.billingCycle as any);
    totalMonthly += monthlyEquivalent;
  }
  let points: number;
  let description: string;
  if (totalMonthly <= 200) { points = 20; description = "Your subscription spending is very low."; }
  else if (totalMonthly <= 500) { points = 15; description = "Your subscription spending is within a comfortable range."; }
  else if (totalMonthly <= 1000) { points = 8; description = "Your subscription spending is moderate."; }
  else if (totalMonthly <= 2000) { points = -2; description = "Your subscription spending is getting high. Consider reviewing."; }
  else if (totalMonthly <= 5000) { points = -10; description = "Your subscription spending is significant."; }
  else { points = -15; description = "Your subscription spending is very high."; }
  return { id: "spending_load", label: "Spending Load", points, description,
    details: ["Monthly total: \u20B9" + Math.round(totalMonthly), active.length + " active subscriptions"] };
}

export function renewalPressureFactor(input: HealthInput): HealthFactor {
  const active = input.subscriptions.filter(s => s.isActive && !s.isArchived);
  let renewalIn7 = 0, renewalIn30 = 0, costIn30 = 0;
  for (const sub of active) {
    const days = daysUntil(sub.renewalDate);
    if (days === null) continue;
    const { monthlyEquivalent } = calcEquivalents(parseFloat(sub.price), sub.billingCycle as any);
    if (days >= 0 && days <= 7) renewalIn7++;
    if (days >= 0 && days <= 30) { renewalIn30++; costIn30 += monthlyEquivalent; }
  }
  let points: number;
  let description: string;
  if (renewalIn7 === 0 && renewalIn30 <= 2) { points = 20; description = "Low renewal pressure. Plenty of time before your next renewals."; }
  else if (renewalIn7 <= 1 && renewalIn30 <= 4) { points = 12; description = "Moderate renewal pressure. A few renewals are coming up."; }
  else if (renewalIn7 <= 2 && renewalIn30 <= 6) { points = 4; description = "Several subscriptions renewing soon."; }
  else { points = -5; description = "High renewal pressure. Multiple subscriptions renewing soon."; }
  return { id: "renewal_pressure", label: "Renewal Pressure", points, description,
    details: [renewalIn7 + " renewing in 7 days", renewalIn30 + " renewing in 30 days", "Upcoming cost: \u20B9" + Math.round(costIn30) + "/mo"] };
}

export function subscriptionStabilityFactor(input: HealthInput): HealthFactor {
  const active = input.subscriptions.filter(s => s.isActive && !s.isArchived);
  if (active.length === 0) return { id: "subscription_stability", label: "Subscription Stability", points: 10, description: "No active subscriptions. Your wallet is clear." };
  const prices = active.map(s => parseFloat(s.price));
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const max = Math.max(...prices);
  const ratio = avg > 0 ? max / avg : 1;
  let points: number;
  let description: string;
  if (ratio <= 3) { points = 15; description = "Your subscriptions are reasonably balanced in cost."; }
  else if (ratio <= 6) { points = 8; description = "One subscription is significantly more expensive than others."; }
  else { points = 2; description = "Your spending is concentrated in one expensive subscription."; }
  return { id: "subscription_stability", label: "Subscription Stability", points, description };
}

export function subscriptionEfficiencyFactor(input: HealthInput): HealthFactor {
  const active = input.subscriptions.filter(s => s.isActive && !s.isArchived);
  const archived = input.subscriptions.filter(s => s.isArchived);
  let points: number;
  let description: string;
  if (archived.length > 0 && active.length > 0) { points = 10; description = "You have archived " + archived.length + " subscription" + (archived.length !== 1 ? "s" : "") + " \u2014 good practice."; }
  else if (active.length <= 3) { points = 15; description = "A lean set of subscriptions. Less financial pressure."; }
  else if (active.length <= 6) { points = 8; description = "A moderate number of active subscriptions."; }
  else if (active.length <= 10) { points = 0; description = "You have a lot of active subscriptions. Consider which ones you use."; }
  else { points = -8; description = "With " + active.length + " active subscriptions, some could be reviewed or cancelled."; }
  return { id: "subscription_efficiency", label: "Subscription Efficiency", points, description };
}

export function overdueFactor(input: HealthInput): HealthFactor {
  const active = input.subscriptions.filter(s => s.isActive && !s.isArchived);
  const overdue = active.filter(s => { const d = daysUntil(s.renewalDate); return d !== null && d < 0; });
  if (overdue.length === 0) return { id: "overdue", label: "Renewal Accuracy", points: 10, description: "All renewal dates are current." };
  return { id: "overdue", label: "Renewal Accuracy", points: -5 * overdue.length,
    description: overdue.length + " subscription" + (overdue.length !== 1 ? "s" : "") + " have past renewal dates.",
    details: overdue.map(s => s.name + " \u2014 was " + s.renewalDate) };
}

export function computeAllFactors(input: HealthInput) {
  const active = input.subscriptions.filter(s => s.isActive && !s.isArchived);
  const factors: HealthFactor[] = [spendingLoadFactor(input), renewalPressureFactor(input), subscriptionStabilityFactor(input), subscriptionEfficiencyFactor(input), overdueFactor(input)];
  let totalMonthly = 0, renewalIn7 = 0, renewalIn30 = 0;
  for (const sub of active) {
    const { monthlyEquivalent } = calcEquivalents(parseFloat(sub.price), sub.billingCycle as any);
    totalMonthly += monthlyEquivalent;
    const days = daysUntil(sub.renewalDate);
    if (days !== null && days >= 0 && days <= 7) renewalIn7++;
    if (days !== null && days >= 0 && days <= 30) renewalIn30++;
  }
  const recommendations: HealthRecommendation[] = [];
  if (active.length > 6) recommendations.push({ id: "review_many", title: "Review your subscriptions", description: "You have " + active.length + " active subscriptions. Review which ones you actually use.", impact: "high", link: "/subscriptions" });
  if (renewalIn7 > 0) {
    const upcoming = active.filter(s => { const d = daysUntil(s.renewalDate); return d !== null && d >= 0 && d <= 7; }).sort((a, b) => daysUntil(a.renewalDate)! - daysUntil(b.renewalDate)!);
    if (upcoming.length > 0) recommendations.push({ id: "upcoming_renewal", title: upcoming[0].name + " renews in " + daysUntil(upcoming[0].renewalDate) + " days", description: "\u20B9" + parseFloat(upcoming[0].price).toFixed(0) + " will be charged soon.", impact: parseFloat(upcoming[0].price) > 500 ? "high" : "medium", link: "/calendar" });
  }
  if (totalMonthly > 2000) recommendations.push({ id: "reduce_spend", title: "Consider reducing monthly spend", description: "Your subscriptions cost \u20B9" + Math.round(totalMonthly) + "/month. Annual plans or cancellations could help.", impact: "high", link: "/subscriptions" });
  const overdue = active.filter(s => daysUntil(s.renewalDate) !== null && daysUntil(s.renewalDate)! < 0);
  if (overdue.length > 0) recommendations.push({ id: "update_overdue", title: "Update overdue renewal dates", description: overdue.length + " subscription" + (overdue.length !== 1 ? "s" : "") + " have past renewal dates.", impact: "medium", link: "/subscriptions" });
  if (totalMonthly > 0 && totalMonthly * 12 <= 12000) recommendations.push({ id: "annual_plans", title: "Consider annual billing", description: "Switching to annual billing often saves 15-20%.", impact: "low" });
  return { factors, recommendations, monthlySpend: Math.round(totalMonthly * 100) / 100, yearlySpend: Math.round(totalMonthly * 12 * 100) / 100, activeCount: active.length, renewalIn7Days: renewalIn7, renewalIn30Days: renewalIn30, averagePerSubscription: active.length > 0 ? Math.round((totalMonthly / active.length) * 100) / 100 : 0 };
}
