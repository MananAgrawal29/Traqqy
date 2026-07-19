import React from "react";
import { Sidebar } from "./Sidebar";
import { ThemeProvider } from "@/components/theme-provider";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="subtrack-theme">
      <div className="flex min-h-[100dvh] flex-col md:flex-row bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}
