import type { HealthInput, HealthResult, HealthStatus } from "./types";
import { computeAllFactors } from "./factors";

function getStatus(score: number): HealthStatus {
  if (score >= 90) return "excellent";
  if (score >= 75) return "healthy";
  if (score >= 50) return "needs_attention";
  if (score >= 25) return "unhealthy";
  return "critical";
}

export function calculateWalletHealth(input: HealthInput): HealthResult {
  const result = computeAllFactors(input);
  let score = 70;
  for (const f of result.factors) score += f.points;
  score = Math.max(0, Math.min(100, score));
  return { score, status: getStatus(score), factors: result.factors, recommendations: result.recommendations,
    summary: { monthlySpend: result.monthlySpend, yearlySpend: result.yearlySpend, activeCount: result.activeCount, renewalIn7Days: result.renewalIn7Days, renewalIn30Days: result.renewalIn30Days, averagePerSubscription: result.averagePerSubscription } };
}
