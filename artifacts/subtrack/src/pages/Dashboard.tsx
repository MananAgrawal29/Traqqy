import React, { useState } from "react";
import { format } from "date-fns";
import { 
  useGetDashboardSummary, 
  useGetUpcomingRenewals, 
  useGetRecentActivity,
  useGetSpendingByCategory
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowRight, CreditCard, DollarSign, Calendar, Activity, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import SubscriptionLogo from "@/components/subscriptions/SubscriptionLogo";

function formatCurrency(amount: number, currency: string = 'INR') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: renewals, isLoading: loadingRenewals } = useGetUpcomingRenewals();
  const { data: activities, isLoading: loadingActivities } = useGetRecentActivity();
  const { data: categorySpends, isLoading: loadingCategories } = useGetSpendingByCategory();

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your subscriptions.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-3xl font-bold font-mono tracking-tight">
                {formatCurrency(summary?.monthlySpend || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Estimated across {summary?.totalActiveSubscriptions || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Yearly Spend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-[120px]" />
            ) : (
              <div className="text-3xl font-bold font-mono tracking-tight">
                {formatCurrency(summary?.yearlySpend || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Projected annual run rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-[60px]" />
            ) : (
              <div className="text-3xl font-bold tracking-tight">
                {summary?.totalActiveSubscriptions || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.totalArchivedSubscriptions || 0} archived
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Renewal</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-[80px]" />
            ) : (
              <div className="text-3xl font-bold tracking-tight">
                {summary?.nextRenewalDays !== null && summary?.nextRenewalDays !== undefined ? (
                  summary.nextRenewalDays === 0 ? "Today" : 
                  summary.nextRenewalDays === 1 ? "Tomorrow" : 
                  `In ${summary.nextRenewalDays} days`
                ) : (
                  "None"
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.upcomingRenewalsCount || 0} renewals in next 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-7">
        
        {/* Upcoming Renewals */}
        <Card className="md:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Renewals</CardTitle>
              <CardDescription>Next 30 days</CardDescription>
            </div>
            <Link href="/calendar" className="text-sm font-medium text-primary flex items-center gap-1 hover:underline">
              View Calendar <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loadingRenewals ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))
              ) : renewals && renewals.length > 0 ? (
                renewals.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <SubscriptionLogo icon={sub.icon} name={sub.name} size="md" />
                      <div>
                        <p className="text-sm font-medium">{sub.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(new Date(sub.renewalDate), 'MMM d, yyyy')}</span>
                          <span>•</span>
                          <span className={cn(
                            "font-medium",
                            (sub.daysUntilRenewal ?? 99) <= 3 ? "text-destructive" :
                            (sub.daysUntilRenewal ?? 99) <= 7 ? "text-orange-500" : ""
                          )}>
                            {sub.daysUntilRenewal === 0 ? "Today" : 
                             sub.daysUntilRenewal === 1 ? "Tomorrow" : 
                             `${sub.daysUntilRenewal} days`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold font-mono">{formatCurrency(sub.price, sub.currency)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{sub.billingCycle.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No upcoming renewals in the next 30 days.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Categories / Activity */}
        <div className="md:col-span-3 space-y-8">
          
          <Card>
            <CardHeader>
              <CardTitle>Top Categories</CardTitle>
              <CardDescription>By monthly spend</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loadingCategories ? (
                   Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))
                ) : categorySpends && categorySpends.length > 0 ? (
                  categorySpends.slice(0, 5).map(cat => (
                    <div key={cat.categoryId || 'un'} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#ccc' }} />
                          {cat.categoryName}
                        </span>
                        <span className="font-mono">{formatCurrency(cat.monthlyAmount)}</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all" 
                          style={{ width: `${cat.percentage}%`, backgroundColor: cat.color || '#ccc' }} 
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    No category data available.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loadingActivities ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>
                ) : activities && activities.length > 0 ? (
                  // Activity endpoint might just be an array, but wait... useGetRecentActivity isn't detailed in the schema.
                  // Wait, looking at the schema, recent activity is an array of what? The schema didn't export Activity type.
                  // I will mock it or handle unknown structure gracefully.
                  activities.map((act: any, i: number) => (
                    <div key={i} className="flex gap-3 items-start">
                      <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm">{act.description || act.message || 'Activity recorded'}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(act.createdAt || new Date()), 'MMM d, h:mm a')}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    No recent activity.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
