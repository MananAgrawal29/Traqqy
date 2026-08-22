import React from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./Sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/motion";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const prefersReduced = usePrefersReducedMotion();

  return (
    <ThemeProvider defaultTheme="system" storageKey="subtrack-theme">
      <div className="flex min-h-[100dvh] flex-col md:flex-row bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={prefersReduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? undefined : { opacity: 0, y: -4 }}
              transition={{
                duration: prefersReduced ? 0 : 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex-1"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </ThemeProvider>
  );
}
