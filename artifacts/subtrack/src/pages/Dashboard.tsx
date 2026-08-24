import React from "react";
import { format } from "date-fns";
import {
  useGetDashboardSummary,
  useGetUpcomingRenewals,
  useGetRecentActivity,
  useGetSpendingByCategory,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import SubscriptionLogo from "@/components/subscriptions/SubscriptionLogo";import { Reveal,
  AnimatedCounter,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";
import { motion } from "framer-motion";
import { AmbientGlow, Sparkle, DoodleRupee, DoodleStar } from "@/components/doodles";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/custom-fetch";

function formatCurrency(amount: number, currency: string = "INR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: renewals, isLoading: loadingRenewals } =
    useGetUpcomingRenewals();
  const { data: activities, isLoading: loadingActivities } =
    useGetRecentActivity();
  const { data: healthData } = useQuery<{ score: number; status: string }>({ queryKey: ["wallet-health"], queryFn: async () => { return await customFetch<{ score: number; status: string }>("/api/wallet-health"); } });
  const { data: categorySpends, isLoading: loadingCategories } =
    useGetSpendingByCategory();

  return (
    <div className="p-6 md:p-10 space-y-12 max-w-5xl mx-auto relative">
      {/* Ambient glow behind hero number */}
      <AmbientGlow className="top-0 left-1/4 -translate-x-1/2" size={400} intensity={0.05} />

      {/* ── Hero number ──────────────────────────────────────────── */}
      <Reveal>
        <div className="relative">
          {loadingSummary ? (
            <Skeleton className="h-16 w-[200px] mb-2" />
          ) : (
            <div className="flex items-baseline gap-3">
              <span className="text-5xl md:text-6xl font-bold tracking-tight font-mono text-foreground">
                {formatCurrency(summary?.monthlySpend || 0)}
              </span>
              <span className="text-lg text-muted-foreground font-medium">
                / month
              </span>
            </div>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            across{" "}
            <span className="font-medium text-foreground">
              {summary?.totalActiveSubscriptions || 0} active
            </span>{" "}
            subscription
            {(summary?.totalActiveSubscriptions || 0) !== 1 ? "s" : ""}
            {summary?.totalArchivedSubscriptions
              ? ` · ${summary.totalArchivedSubscriptions} archived`
              : ""}
          </p>
          <DoodleRupee className="absolute top-0 -left-8 text-primary/20 hidden lg:block" size={24} />
          <DoodleStar className="absolute top-2 -right-6 text-primary/15 hidden lg:block" size={16} />
          <Sparkle className="absolute top-0 right-0 hidden lg:block" size={10} color="hsl(38 90% 55%)" delay={0.5} />
        </div>
      </Reveal>

      {/* ── Wallet Health Card ── */}
      {healthData && (
        <Reveal delay={0.05}>
          <Link href="/health" className="block rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                  <span className="text-xl font-bold font-mono text-primary">{healthData.score}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">Wallet Health</p>
                  <p className="text-xs text-muted-foreground capitalize">{healthData.status.replace("_", " ")} &#10022;</p>
                </div>
              </div>
              <span className="text-xs font-medium text-primary flex items-center gap-1">View Health <ArrowRight className="h-3 w-3" /></span>
            </div>
          </Link>
        </Reveal>
      )}

      {/* ── Upcoming renewals ────────────────────────────────────── */}
      <Reveal delay={0.1}>
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold tracking-tight">
              Upcoming renewals
            </h2>
            <Link
              href="/calendar"
              className="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
            >
              View calendar <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loadingRenewals ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : renewals && renewals.length > 0 ? (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="divide-y divide-border/50"
            >
              {renewals.map((sub) => (
                <motion.div
                  key={sub.id}
                  variants={staggerItem}
                  className="flex items-center justify-between py-3.5 group hover:bg-accent/5 -mx-3 px-3 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <SubscriptionLogo
                      icon={sub.icon}
                      name={sub.name}
                      size="md"
                    />
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">
                        {sub.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>
                          {sub.renewalDate ? format(new Date(sub.renewalDate), "MMM d, yyyy") : "—"}
                        </span>
                        <span className="text-border">·</span>
                        <span
                          className={cn(
                            "font-medium",
                            (sub.daysUntilRenewal ?? 99) <= 3
                              ? "text-destructive"
                              : (sub.daysUntilRenewal ?? 99) <= 7
                                ? "text-warning"
                                : ""
                          )}
                        >
                          {sub.daysUntilRenewal === 0
                            ? "Today"
                            : sub.daysUntilRenewal === 1
                              ? "Tomorrow"
                              : `In ${sub.daysUntilRenewal} days`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold font-mono">
                      {formatCurrency(sub.price, sub.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {sub.billingCycle.replace("_", " ")}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border/50 rounded-xl">
              No upcoming renewals in the next 30 days.
            </div>
          )}
        </section>
      </Reveal>

        {/* Category breakdown */}
        <Reveal delay={0.2}>
          <section>
            <h2 className="text-lg font-semibold tracking-tight mb-5">
              Where your money goes
            </h2>

            {loadingCategories ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : categorySpends && categorySpends.length > 0 ? (
              <div className="space-y-4">
                {categorySpends.slice(0, 5).map((cat, i) => (
                  <motion.div
                    key={cat.categoryId || "un"}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.4 + i * 0.08,
                    }}
                  >
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium flex items-center gap-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || "#ccc" }}
                        />
                        {cat.categoryName}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {formatCurrency(cat.monthlyAmount)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.percentage}%` }}
                        transition={{
                          duration: 0.8,
                          ease: [0.22, 1, 0.36, 1],
                          delay: 0.6 + i * 0.1,
                        }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: cat.color || "#ccc" }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground border border-dashed border-border/50 rounded-xl">
                No category data available.
              </div>
            )}
          </section>
        </Reveal>


      {/* ── Attention section ────────────────────────────────────── */}
      {renewals &&
        renewals.some((r) => (r.daysUntilRenewal ?? 99) <= 3) && (
          <Reveal delay={0.4}>
            <section className="rounded-xl bg-destructive/5 border border-destructive/10 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-destructive">
                    Needs attention
                  </h3>
                  <div className="mt-2 space-y-1.5">
                    {renewals
                      .filter((r) => (r.daysUntilRenewal ?? 99) <= 3)
                      .map((sub) => (
                        <p key={sub.id} className="text-sm text-destructive/80">
                          <span className="font-medium">{sub.name}</span>{" "}
                          renews{" "}
                          {sub.daysUntilRenewal === 0
                            ? "today"
                            : sub.daysUntilRenewal === 1
                              ? "tomorrow"
                              : `in ${sub.daysUntilRenewal} days`}{" "}
                          — {formatCurrency(sub.price, sub.currency)}
                        </p>
                      ))}
                  </div>
                </div>
              </div>
            </section>
          </Reveal>
        )}
    </div>
  );
}
