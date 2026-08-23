interface Subscription { id: number; clerkId: string; name: string; icon: string | null; categoryId: number | null; price: string; currency: string; billingCycle: string; renewalDate: string; paymentMethod: string | null; notes: string | null; isActive: boolean; isArchived: boolean; createdAt: Date; updatedAt: Date; }

export interface HealthInput {
  subscriptions: Subscription[];
}

export interface HealthFactor {
  id: string;
  label: string;
  points: number;
  description: string;
  details?: string[];
}

export interface HealthRecommendation {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  link?: string;
}

export type HealthStatus = "excellent" | "healthy" | "needs_attention" | "unhealthy" | "critical";

export interface HealthResult {
  score: number;
  status: HealthStatus;
  factors: HealthFactor[];
  recommendations: HealthRecommendation[];
  summary: {
    monthlySpend: number;
    yearlySpend: number;
    activeCount: number;
    renewalIn7Days: number;
    renewalIn30Days: number;
    averagePerSubscription: number;
  };
}
