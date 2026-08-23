export type BillingCycle = "weekly" | "monthly" | "quarterly" | "semi_annual" | "yearly";

const MULTIPLIERS: Record<BillingCycle, { monthly: number; annual: number }> = {
  weekly:     { monthly: 52 / 12, annual: 52 },
  monthly:    { monthly: 1,       annual: 12 },
  quarterly:  { monthly: 1 / 3,   annual: 4 },
  semi_annual:{ monthly: 1 / 6,   annual: 2 },
  yearly:     { monthly: 1 / 12,  annual: 1 },
};

export function calcEquivalents(price: number, billingCycle: BillingCycle) {
  const m = MULTIPLIERS[billingCycle] ?? MULTIPLIERS.monthly;
  return {
    monthlyEquivalent: Math.round(price * m.monthly * 100) / 100,
    annualEquivalent:  Math.round(price * m.annual  * 100) / 100,
  };
}

export function daysUntil(renewalDateStr: string): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewal = new Date(renewalDateStr);
  renewal.setHours(0, 0, 0, 0);
  const diff = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}
