import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import {
  LayoutDashboard,
  List,
  BarChart2,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/subscriptions", label: "Subscriptions", icon: List },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const SidebarContent = () => (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
          <img src={`${basePath}/logo.svg`} alt="Traqqy" className="h-8 w-8" />
          <span>Traqqy</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-2">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="h-9 w-9 overflow-hidden rounded-full bg-sidebar-accent shrink-0">
            <img src={user?.imageUrl} alt={user?.fullName || "User"} className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-sm font-medium text-white">{user?.fullName || "User"}</span>
            <span className="truncate text-xs text-sidebar-foreground/60">{user?.primaryEmailAddress?.emailAddress}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={() => signOut({ redirectUrl: basePath || "/" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className={cn("hidden md:flex w-64 flex-col border-r border-sidebar-border", className)}>
        <SidebarContent />
      </div>
      
      <div className="md:hidden p-4 border-b bg-background flex items-center justify-between sticky top-0 z-50">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <img src={`${basePath}/logo.svg`} alt="SubTrack" className="h-6 w-6" />
          <span>SubTrack</span>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
