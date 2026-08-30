import React from "react";
import {
  useGetMonthlyTrend,
  useGetSpendingByCategory,
  useGetAnalyticsOverview,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Reveal } from "@/lib/motion";
import { AmbientGlow, Sparkle } from "@/components/doodles";

function formatCurrency(amount: number, currency: string = "INR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export default function Analytics() {
  const { data: overview, isLoading: loadingOverview } =
    useGetAnalyticsOverview();
  const { data: monthlyTrend, isLoading: loadingTrend } =
    useGetMonthlyTrend();
  const { data: categorySpends, isLoading: loadingCategories } =
    useGetSpendingByCategory();
  
  const currency = overview?.defaultCurrency || "INR";

  return (
    <div className="p-6 md:p-10 space-y-12 max-w-6xl mx-auto relative">
      <AmbientGlow className="top-0 right-0" size={400} intensity={0.04} />

      {/* Hero number */}
      <Reveal>
        <div className="relative">
          {loadingOverview ? (
            <Skeleton className="h-16 w-[200px] mb-2" />
          ) : (
            <div className="flex items-baseline gap-3">
              <span className="text-5xl md:text-6xl font-bold tracking-tight font-mono text-foreground">
                {formatCurrency(overview?.totalAnnualSpend || 0, currency)}
              </span>
              <span className="text-lg text-muted-foreground font-medium">
                / year
              </span>
            </div>
          )}
          <Sparkle className="absolute top-0 right-0 hidden lg:block" size={12} color="hsl(38 90% 55%)" delay={0.5} />
          <div className="mt-3 flex items-center gap-6 text-sm text-muted-foreground">
            <span>
              Average{" "}
              <span className="font-medium text-foreground font-mono">
                {formatCurrency(overview?.averageMonthlySpend || 0, currency)}
              </span>{" "}
              / month
            </span>
            {overview?.highestExpense && (
              <span>
                Highest:{" "}
                <span className="font-medium text-foreground">
                  {overview.highestExpense.name}
                </span>{" "}
                at{" "}
                <span className="font-mono">
                  {formatCurrency(
                    overview.highestExpense.monthlyEquivalent || 0,
                    currency
                  )}
                </span>
                /mo
              </span>
            )}
          </div>
        </div>
      </Reveal>

      {/* Charts grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Spending trend */}
        <Reveal delay={0.1} className="lg:col-span-2">
          <section>
            <h2 className="text-lg font-semibold tracking-tight mb-5">
              Spending trend
            </h2>
            <div className="rounded-xl bg-card p-5">
              <div className="h-[320px] w-full">
                {loadingTrend ? (
                  <Skeleton className="h-full w-full" />
                ) : monthlyTrend && monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={monthlyTrend}
                      margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorAmount"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="95%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 12,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 12,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        tickFormatter={(value) => formatCurrency(value, currency)}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          backgroundColor: "hsl(var(--card))",
                        }}
                        formatter={(value: number) => [
                          formatCurrency(value, currency),
                          "Spend",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="totalAmount"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorAmount)"
                        isAnimationActive={true}
                        animationDuration={1200}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Not enough data for chart.
                  </div>
                )}
              </div>
            </div>
          </section>
        </Reveal>

        {/* Category pie */}
        <Reveal delay={0.2}>
          <section>
            <h2 className="text-lg font-semibold tracking-tight mb-5">
              By category
            </h2>
            <div className="rounded-xl bg-card p-5">
              <div className="h-[260px] w-full">
                {loadingCategories ? (
                  <Skeleton className="h-full w-full rounded-full" />
                ) : categorySpends && categorySpends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categorySpends}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="monthlyAmount"
                        stroke="none"
                        isAnimationActive={true}
                        animationDuration={1000}
                      >
                        {categorySpends.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || "hsl(var(--primary))"}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value, currency)}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          backgroundColor: "hsl(var(--card))",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    No category data.
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {categorySpends?.slice(0, 6).map((cat, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate" title={cat.categoryName}>
                      {cat.categoryName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
