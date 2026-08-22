import React, { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from "date-fns";
import {
  useGetCalendarEvents,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Reveal } from "@/lib/motion";
import { motion } from "framer-motion";
import SubscriptionLogo from "@/components/subscriptions/SubscriptionLogo";

function formatCurrency(amount: number, currency: string = "INR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: calendarData } = useGetCalendarEvents({ year, month });

  const nextMonth = () => setCurrentDate(new Date(year, month, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
  const goToday = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const allUpcoming = calendarData
    ?.flatMap((d) => (d.subscriptions || []).map((s) => ({ ...s, date: d.date })))
    .filter((s) => new Date(s.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-6xl mx-auto">
      <Reveal>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              See your upcoming subscription renewals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={goToday} size="sm">Today</Button>
            <div className="flex items-center rounded-lg border border-border">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-r-none border-r border-border h-9 w-9">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-4 py-2 text-sm font-semibold min-w-[120px] text-center">
                {format(currentDate, "MMMM yyyy")}
              </div>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-l-none border-l border-border h-9 w-9">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-8 lg:grid-cols-4">
        <Reveal delay={0.05} className="lg:col-span-3">
          <div className="rounded-xl bg-card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border/50">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="py-3 text-center text-xs font-medium text-muted-foreground">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr">
              {calendarDays.map((day, i) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayData = calendarData?.find((d) => d.date === dateStr);
                const subs = dayData?.subscriptions || [];
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isDayToday = isToday(day);

                return (
                  <div key={i} className={`min-h-[80px] border-b border-r border-border/30 p-2 transition-colors ${!isCurrentMonth ? "bg-muted/5 text-muted-foreground/30" : "bg-background hover:bg-muted/5"} ${(i + 1) % 7 === 0 ? "border-r-0" : ""}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full ${isDayToday ? "bg-primary text-primary-foreground" : ""}`}>
                        {format(day, "d")}
                      </span>
                    </div>
                    {subs.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="w-full text-left bg-primary/10 hover:bg-primary/15 border border-primary/15 rounded px-1.5 py-0.5 text-[10px] text-primary font-medium transition-colors">
                            {subs.length} renewal{subs.length > 1 ? "s" : ""}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="start">
                          <div className="px-3 py-2.5 font-medium text-sm border-b border-border/50 bg-muted/30">
                            {format(day, "MMM d, yyyy")}
                          </div>
                          <div className="max-h-[180px] overflow-auto">
                            {subs.map((sub) => (
                              <div key={sub.id} className="p-2.5 border-b border-border/30 last:border-0 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                  <SubscriptionLogo name={sub.name} size="sm" />
                                  <span className="text-xs font-medium truncate">{sub.name}</span>
                                </div>
                                <span className="text-xs font-mono text-muted-foreground shrink-0">
                                  {formatCurrency(sub.price, sub.currency)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Upcoming</h2>
            {allUpcoming && allUpcoming.length > 0 ? (
              <div className="space-y-3">
                {allUpcoming.map((sub, i) => (
                  <motion.div
                    key={`${sub.id}-${sub.date}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + i * 0.06 }}
                    className="flex items-center gap-3 py-2"
                  >
                    <SubscriptionLogo name={sub.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{sub.name}</p>
                      <p className="text-[11px] text-muted-foreground">{format(new Date(sub.date), "MMM d")}</p>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {formatCurrency(sub.price, sub.currency)}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No upcoming renewals.</p>
            )}
          </section>
        </Reveal>
      </div>
    </div>
  );
}
