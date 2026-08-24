import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import {
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { TraqqyBrand } from "@/components/layout/TraqqyBrand";
import { usePrefersReducedMotion } from "@/lib/motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/reminders", label: "Reminders" },
  { href: "/calendar", label: "Calendar" },
  { href: "/analytics", label: "Analytics" },
  { href: "/health", label: "Health" },
];

function UserDropdown({ basePath }: { basePath: string }) {
  const { signOut } = useClerk();
  const { user } = useUser();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full p-0.5 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <div className="h-8 w-8 overflow-hidden rounded-full bg-muted">
            <img
              src={user?.imageUrl}
              alt={user?.fullName || "User"}
              className="h-full w-full object-cover"
            />
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate">{user?.fullName || "User"}</p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ redirectUrl: basePath || "/" })}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavPills({ mobile = false }: { mobile?: boolean }) {
  const [location] = useLocation();
  const prefersReduced = usePrefersReducedMotion();
  const pillId = mobile ? "nav-pill-mobile" : "nav-pill";

  return (
    <nav
      className={cn(
        "flex items-center gap-1",
        mobile
          ? "nav-scroll px-4 pb-2 overflow-x-auto"
          : "mx-auto bg-muted/40 rounded-lg p-1"
      )}
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const isActive =
          location === item.href ||
          location.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative shrink-0 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors duration-150 z-10",
              isActive
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.div
                layoutId={pillId}
                className="absolute inset-0 bg-primary rounded-md"
                style={{ zIndex: -1 }}
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : {
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                      }
                }
              />
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <>
      {/* ── Desktop top bar ─────────────────────────────────── */}
      <header className="hidden md:flex sticky top-0 z-50 h-14 items-center border-b border-border bg-background/80 backdrop-blur-xl px-5 gap-4">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 shrink-0"
        >
          <TraqqyBrand variant="wordmark" size={24} />
        </Link>

        {/* Pill navigation */}
        <NavPills />

        {/* User avatar */}
        <div className="shrink-0">
          <UserDropdown basePath={basePath} />
        </div>
      </header>

      {/* ── Mobile header + pill bar ────────────────────────── */}
      <div className="md:hidden sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        {/* Brand bar */}
        <div className="flex items-center justify-between h-12 px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
          >
            <TraqqyBrand variant="wordmark" size={20} animate={false} />
          </Link>
          <UserDropdown basePath={basePath} />
        </div>

        {/* Scrollable pill bar */}
        <NavPills mobile />
      </div>
    </>
  );
}
