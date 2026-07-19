import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns";
import { useGetCalendarEvents, type CalendarDay } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // API expects 1-12

  const { data: calendarData, isLoading } = useGetCalendarEvents({ year, month });

  const nextMonth = () => setCurrentDate(new Date(year, month, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
  const goToday = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
  
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on Saturday

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">See your upcoming subscription renewals.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={goToday}>Today</Button>
          <div className="flex items-center rounded-md border">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-r-none border-r"><ChevronLeft className="h-4 w-4" /></Button>
            <div className="px-4 py-2 text-sm font-semibold min-w-[120px] text-center">
              {format(currentDate, "MMMM yyyy")}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-l-none border-l"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr">
          {calendarDays.map((day, i) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayData = calendarData?.find(d => d.date === dateStr);
            const subs = dayData?.subscriptions || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);
            const hasSubs = subs.length > 0;

            return (
              <div 
                key={i} 
                className={`min-h-[100px] border-b border-r p-2 transition-colors ${!isCurrentMonth ? 'bg-muted/10 text-muted-foreground/50' : 'bg-background hover:bg-muted/10'} ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full ${isDayToday ? 'bg-primary text-primary-foreground' : ''}`}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                {hasSubs && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full text-left bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded px-2 py-1 text-xs text-blue-700 dark:text-blue-300 font-medium transition-colors">
                        {subs.length} renewal{subs.length > 1 ? 's' : ''}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <div className="px-4 py-3 font-medium border-b bg-muted/30">
                        {format(day, 'MMMM d, yyyy')}
                      </div>
                      <div className="max-h-[200px] overflow-auto">
                        {subs.map(sub => (
                          <div key={sub.id} className="p-3 border-b last:border-0 flex items-center justify-between hover:bg-muted/50 transition-colors">
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{sub.name}</span>
                              <span className="text-xs text-muted-foreground capitalize">{sub.billingCycle.replace('_', ' ')}</span>
                            </div>
                            <span className="font-mono text-sm">{formatCurrency(sub.price, sub.currency)}</span>
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
      </Card>
    </div>
  );
}
