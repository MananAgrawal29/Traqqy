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
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
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
      {/* Brand */}
      <div className="px-5 pt-6 pb-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 group"
        >
          <motion.img
            src={`${basePath}/logo.svg`}
            alt="Traqqy"
            className="h-7 w-7"
            whileHover={{ scale: 1.08, rotate: -4 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          />
          <span className="text-[15px] font-bold tracking-tight text-white">
            Traqqy
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {navItems.map((item) => {
          const isActive =
            location === item.href ||
            location.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/40"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 transition-colors duration-150",
                  isActive ? "text-primary" : "text-sidebar-foreground/40"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="h-8 w-8 overflow-hidden rounded-full bg-sidebar-accent shrink-0">
            <img
              src={user?.imageUrl}
              alt={user?.fullName || "User"}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-[13px] font-medium text-white/90">
              {user?.fullName || "User"}
            </span>
            <span className="truncate text-[11px] text-sidebar-foreground/40">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/40 h-9 px-3 text-[13px]"
          onClick={() => signOut({ redirectUrl: basePath || "/" })}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Log out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden md:flex w-[240px] flex-col border-r border-sidebar-border shrink-0",
          className
        )}
      >
        <SidebarContent />
      </div>

      {/* Mobile header */}
      <div className="md:hidden px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-50">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-base"
        >
          <img
            src={`${basePath}/logo.svg`}
            alt="Traqqy"
            className="h-6 w-6"
          />
          <span className="tracking-tight">Traqqy</span>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-4.5 w-4.5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[240px] border-r-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
