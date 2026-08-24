import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal, staggerContainer, staggerItem } from "@/lib/motion";
import { Heart, TrendingUp, TrendingDown, AlertTriangle, ArrowRight, Sparkles, Settings } from "lucide-react";
import { customFetch } from "@workspace/api-client-react/custom-fetch";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";
import HealthOnboarding, { type HealthPreferences } from "@/components/health/HealthOnboarding";

function formatCurrency(amount: number, currency: string = "INR") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

interface HealthData {
  score: number; status: string;
  factors: Array<{ id: string; label: string; score: number; maxScore: number; description: string }>;
  recommendations: Array<{ id: string; title: string; description: string; impact: string; link?: string }>;
  summary: { monthlySpend: number; yearlySpend: number; activeCount: number; renewalIn7Days: number; renewalIn30Days: number; averagePerSubscription: number };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  excellent: { label: "Excellent", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: React.createElement(Sparkles, { className: "h-5 w-5" }) },
  healthy: { label: "Healthy", color: "text-primary", bg: "bg-primary/10", icon: React.createElement(Heart, { className: "h-5 w-5" }) },
  needs_attention: { label: "Needs attention", color: "text-amber-500", bg: "bg-amber-500/10", icon: React.createElement(AlertTriangle, { className: "h-5 w-5" }) },
  unhealthy: { label: "Unhealthy", color: "text-orange-500", bg: "bg-orange-500/10", icon: React.createElement(AlertTriangle, { className: "h-5 w-5" }) },
  critical: { label: "Critical", color: "text-destructive", bg: "bg-destructive/10", icon: React.createElement(AlertTriangle, { className: "h-5 w-5" }) },
};

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r="54" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
        <motion.circle cx="70" cy="70" r="54" fill="none" stroke="hsl(38, 80%, 50%)" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }} />
      </svg>
      <div className="absolute text-center">
        <span className="text-4xl font-bold font-mono text-foreground">{score}</span>
        <span className="text-lg text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

export default function Health() {
  const queryClient = useQueryClient();
  const { data: settings } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isEditingPrefs, setIsEditingPrefs] = useState(false);

  const rawPrefs = settings?.healthPreferences;
  const healthPrefs: HealthPreferences | null = typeof rawPrefs === "string" ? JSON.parse(rawPrefs) : (rawPrefs as unknown as HealthPreferences) || null;
  const hasCompletedOnboarding = healthPrefs?.completedOnboarding ?? false;

  // Show onboarding on first visit if not completed
  useEffect(() => {
    if (settings && !hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, [settings, hasCompletedOnboarding]);

  const handleOnboardingComplete = (prefs: HealthPreferences) => {
    // Immediately update cache so hasCompletedOnboarding is true before modal closes
    const current = queryClient.getQueryData<any>(getGetSettingsQueryKey());
    if (current) {
      queryClient.setQueryData(getGetSettingsQueryKey(), { ...current, healthPreferences: prefs });
    }
    queryClient.invalidateQueries({ queryKey: ["wallet-health"] });
    updateSettings.mutate(
      { data: { healthPreferences: JSON.stringify(prefs) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        },
        onError: () => {
          // Revert cache on failure
          if (current) queryClient.setQueryData(getGetSettingsQueryKey(), current);
          toast.error("Failed to save preferences");
        },
      }
    );
  };

  const { data, isLoading } = useQuery<HealthData>({
    queryKey: ["wallet-health"],
    queryFn: async () => {
      return await customFetch<HealthData>("/api/wallet-health");
    },
  });
  const config = data ? STATUS_CONFIG[data.status] || STATUS_CONFIG.healthy : STATUS_CONFIG.healthy;

  return (
    <>
      <HealthOnboarding
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
        existingPrefs={healthPrefs}
        isEditing={isEditingPrefs}
      />
      <div className="p-6 md:p-10 space-y-10 max-w-4xl mx-auto">
        <Reveal>
          <section className="rounded-2xl border border-border bg-card p-8 text-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-[140px] w-[140px] rounded-full" />
                <Skeleton className="h-8 w-[200px]" />
                <Skeleton className="h-5 w-[300px]" />
              </div>
            ) : data ? (
              <>
                <div className="flex justify-center mb-4"><ScoreRing score={data.score} /></div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className={"text-sm font-semibold uppercase tracking-wide " + config.color}>{config.label}</span>
                  <span className={config.bg + " " + config.color + " p-1 rounded-full"}>{config.icon}</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {data.score >= 75 ? "Your subscription wallet is in good shape." : data.score >= 50 ? "Your subscriptions could use some attention." : "Your subscription wallet needs immediate attention."}
                </p>
                {healthPrefs?.monthlyBudget && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Budget: {formatCurrency(healthPrefs.monthlyBudget)}/month
                  </p>
                )}
              </>
            ) : null}
          </section>
        </Reveal>

        {healthPrefs && (
          <Reveal delay={0.05}>
            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {healthPrefs.spendingFeeling === "too_much" && "You want to reduce spending"}
                    {healthPrefs.spendingFeeling === "about_right" && "Spending feels about right"}
                    {healthPrefs.spendingFeeling === "could_spend_more" && "You have room to spend more"}
                  </span>
                  {healthPrefs.priorityCategories.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Priorities: {healthPrefs.priorityCategories.slice(0, 3).join(", ")}{healthPrefs.priorityCategories.length > 3 ? "..." : ""}
                    </span>
                  )}
                </div>
              </div>
            </section>
          </Reveal>
        )}

        <Reveal delay={0.1}>
          <section>
            <h2 className="text-lg font-semibold tracking-tight mb-5">What affects your health</h2>
            {isLoading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div> : data ? (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                {data.factors.map((f) => (
                  <motion.div key={f.id} variants={staggerItem} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
                    <div className={"mt-0.5 shrink-0 " + (f.score >= f.maxScore * 0.8 ? "text-emerald-500" : f.score >= f.maxScore * 0.5 ? "text-amber-500" : "text-destructive")}>
                      {f.score >= f.maxScore * 0.8 ? <TrendingUp className="h-4 w-4" /> : f.score >= f.maxScore * 0.5 ? <TrendingUp className="h-4 w-4 opacity-50" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{f.label}</span>
                        <span className="text-sm font-mono font-semibold text-foreground">{f.score}/{f.maxScore}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : null}
          </section>
        </Reveal>

        {data && (
          <Reveal delay={0.2}>
            <section>
              <h2 className="text-lg font-semibold tracking-tight mb-5">Subscription spending</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[{ label: "Monthly", value: formatCurrency(data.summary.monthlySpend) }, { label: "Yearly", value: formatCurrency(data.summary.yearlySpend) }, { label: "Active", value: data.summary.activeCount + " subscriptions" }, { label: "Avg / sub", value: formatCurrency(data.summary.averagePerSubscription) }].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-lg font-semibold font-mono mt-1">{item.value}</p></div>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {data && (
          <Reveal delay={0.25}>
            <section>
              <h2 className="text-lg font-semibold tracking-tight mb-5">Renewal pressure</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground mb-1">Next 7 days</p><p className="text-3xl font-bold font-mono">{data.summary.renewalIn7Days}</p><p className="text-xs text-muted-foreground mt-1">{data.summary.renewalIn7Days === 0 ? "No renewals due" : "renewal(s) due"}</p></div>
                <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground mb-1">Next 30 days</p><p className="text-3xl font-bold font-mono">{data.summary.renewalIn30Days}</p><p className="text-xs text-muted-foreground mt-1">{data.summary.renewalIn30Days === 0 ? "No renewals due" : "renewal(s) due"}</p></div>
              </div>
            </section>
          </Reveal>
        )}

        {data && data.recommendations.length > 0 && (
          <Reveal delay={0.3}>
            <section>
              <h2 className="text-lg font-semibold tracking-tight mb-5">Improve your Wallet Health</h2>
              <div className="space-y-3">
                {data.recommendations.map((rec) => (
                  <div key={rec.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={"text-xs font-medium px-2 py-0.5 rounded-full " + (rec.impact === "high" ? "bg-destructive/10 text-destructive" : rec.impact === "medium" ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground")}>{rec.impact}</span>
                          <h3 className="text-sm font-medium">{rec.title}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                      </div>
                      {rec.link && <Link href={rec.link} className="text-primary hover:text-primary/80 shrink-0 mt-1"><ArrowRight className="h-4 w-4" /></Link>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {hasCompletedOnboarding && (
          <Reveal delay={0.35}>
            <div className="flex justify-center pt-4 pb-8">
              <button onClick={() => { setIsEditingPrefs(true); setShowOnboarding(true); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Settings className="h-4 w-4" />
                Edit health preferences
              </button>
            </div>
          </Reveal>
        )}
      </div>
    </>
  );
}