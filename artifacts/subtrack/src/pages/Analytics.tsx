import React, { useState } from "react";
import { format } from "date-fns";
import {
  useGetMonthlyTrend,
  useGetSpendingByCategory,
  useGetAnalyticsOverview,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";

function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export default function Analytics() {
  const { data: overview, isLoading: loadingOverview } = useGetAnalyticsOverview();
  const { data: monthlyTrend, isLoading: loadingTrend } = useGetMonthlyTrend();
  const { data: categorySpends, isLoading: loadingCategories } = useGetSpendingByCategory();

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Deep dive into your subscription spending.</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Annual Spend</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold font-mono tracking-tight">
                {formatCurrency(overview?.totalAnnualSpend || 0)}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Monthly</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold font-mono tracking-tight">
                {formatCurrency(overview?.averageMonthlySpend || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Sub Cost</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold font-mono tracking-tight">
                {formatCurrency(overview?.averageSubscriptionCost || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Highest Expense</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Skeleton className="h-8 w-full" />
            ) : overview?.highestExpense ? (
              <>
                <div className="text-xl font-bold tracking-tight truncate" title={overview.highestExpense.name}>
                  {overview.highestExpense.name}
                </div>
                <div className="text-sm text-muted-foreground font-mono mt-1">
                  {formatCurrency(overview.highestExpense.monthlyEquivalent || 0)} /mo
                </div>
              </>
            ) : (
              <div className="text-xl text-muted-foreground">None</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Spending Trend (12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              {loadingTrend ? (
                <Skeleton className="h-full w-full" />
              ) : monthlyTrend && monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                      tickFormatter={(value) => `$${value}`}
                      dx={-10}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                      formatter={(value: number) => [formatCurrency(value), "Spend"]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="totalAmount" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorAmount)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Not enough data for chart.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>By Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {loadingCategories ? (
                <Skeleton className="h-full w-full rounded-full" />
              ) : categorySpends && categorySpends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySpends}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="monthlyAmount"
                      stroke="none"
                    >
                      {categorySpends.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || "hsl(var(--primary))"} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No category data.
                </div>
              )}
            </div>
            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {categorySpends?.slice(0, 6).map((cat, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="truncate" title={cat.categoryName}>{cat.categoryName}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
