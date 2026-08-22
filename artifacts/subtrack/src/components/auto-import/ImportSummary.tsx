import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight, PartyPopper } from "lucide-react";
import { Link } from "wouter";
import { Reveal } from "@/lib/motion";
import { motion } from "framer-motion";

interface ImportedItem {
  subscriptionId: number;
  name: string;
  candidateId: string;
}

interface FailedItem {
  candidateId: string;
  reason: string;
}

interface ImportSummaryProps {
  imported: ImportedItem[];
  failed: FailedItem[];
  onRescan: () => void;
}

export default function ImportSummary({
  imported,
  failed,
  onRescan,
}: ImportSummaryProps) {
  return (
    <Reveal>
      <div className="rounded-xl bg-card p-6 space-y-5">
        {imported.length > 0 ? (
          <>
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  duration: 0.5,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                <PartyPopper className="h-6 w-6 text-primary" />
              </motion.div>
              <div>
                <h3 className="font-semibold text-lg">
                  {imported.length} subscription
                  {imported.length !== 1 ? "s" : ""} imported!
                </h3>
                <p className="text-sm text-muted-foreground">
                  They&apos;re now part of your Traqqy dashboard.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {imported.map((item, i) => (
                <motion.div
                  key={item.candidateId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.2 + i * 0.08,
                  }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/10"
                >
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  <span className="text-sm font-medium">
                    {item.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <XCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <h3 className="font-semibold">Import failed</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Something went wrong during import.
            </p>
          </div>
        )}

        {failed.length > 0 && (
          <div className="space-y-2">
            {failed.map((item) => (
              <div
                key={item.candidateId}
                className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/10"
              >
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-sm text-destructive">
                  {item.reason}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Link href="/subscriptions">
            <Button className="gap-2">
              View Subscriptions
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="outline" onClick={onRescan}>
            Scan Again
          </Button>
        </div>
      </div>
    </Reveal>
  );
}
