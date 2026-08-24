import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BarChart3, BellRing, CalendarDays, ShieldCheck } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="px-6 h-16 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/traqqy-symbol.png`} alt="SubTrack" className="h-8 w-8" />
          <span className="font-bold text-xl tracking-tight">Traqqy</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
            Sign in
          </Link>
          <Link href="/sign-up" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        <section className="w-full max-w-5xl px-6 py-24 md:py-32 flex flex-col items-center text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6">
            Control your <br className="hidden md:block"/> recurring expenses.
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl">
            SubTrack is the command center for your subscriptions. See exactly what you're paying for, when it renews, and cancel what you don't need.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/sign-up" className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 py-2 text-base font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90">
              Start Tracking for Free
            </Link>
          </div>
          
          <div className="mt-20 w-full rounded-xl border bg-card p-2 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <img 
              src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/hero-dashboard.jpg`}
              alt="Traqqy Dashboard Preview" 
              className="w-full h-auto rounded-lg border object-cover object-top opacity-90 shadow-sm"
              style={{ maxHeight: '400px' }}
            />
          </div>
        </section>

        <section className="w-full bg-slate-50 dark:bg-slate-900/50 py-24">
          <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Deep Analytics</h3>
              <p className="text-muted-foreground">See exactly where your money goes with category breakdowns and historical spending trends.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Renewal Calendar</h3>
              <p className="text-muted-foreground">Never get caught by surprise. A dedicated calendar view for all your upcoming payments.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <BellRing className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Reminders</h3>
              <p className="text-muted-foreground">Get notified before you get charged. Set custom alerts 1, 3, or 7 days before a renewal.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SubTrack. All rights reserved.</p>
      </footer>
    </div>
  );
}
