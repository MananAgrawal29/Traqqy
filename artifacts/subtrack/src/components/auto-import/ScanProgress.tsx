import React from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Reveal } from "@/lib/motion";

interface ScanProgressProps {
  status: string;
  emailsFound: number;
  emailsProcessed: number;
  candidatesFound: number;
}

const STATUS_LABELS: Record<string, string> = {
  queued: "Preparing...",
  searching: "Searching your inbox...",
  analyzing: "Looking for subscription patterns...",
  scoring: "Evaluating what we found...",
  complete: "Scan complete!",
  failed: "Scan failed",
};

export default function ScanProgress({
  status,
  emailsFound,
  emailsProcessed,
  candidatesFound,
}: ScanProgressProps) {
  const isActive = status !== "complete" && status !== "failed";

  const progressPercent =
    emailsFound > 0
      ? Math.round((emailsProcessed / emailsFound) * 100)
      : status === "queued"
        ? 0
        : 50;

  return (
    <Reveal>
      <div className="rounded-xl bg-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          {isActive ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <div
              className={`h-5 w-5 rounded-full ${
                status === "complete" ? "bg-success" : "bg-destructive"
              }`}
            />
          )}
          <div>
            <h3 className="font-semibold">
              {STATUS_LABELS[status] || status}
            </h3>
            <p className="text-sm text-muted-foreground">
              {emailsFound > 0
                ? `${emailsProcessed} of ${emailsFound} emails scanned`
                : "Starting scan..."}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-primary rounded-full"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold font-mono text-foreground">
              {emailsFound}
            </p>
            <p className="text-xs text-muted-foreground">Emails found</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-foreground">
              {emailsProcessed}
            </p>
            <p className="text-xs text-muted-foreground">Processed</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-primary">
              {candidatesFound}
            </p>
            <p className="text-xs text-muted-foreground">
              {candidatesFound === 1
                ? "Discovery"
                : "Discoveries"}
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
