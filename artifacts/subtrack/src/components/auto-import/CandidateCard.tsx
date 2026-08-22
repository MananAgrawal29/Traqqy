import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface Candidate {
  id: string;
  merchantName: string;
  catalogMatch: { id: string; name: string } | null;
  amount: number;
  currency: string;
  billingCycle: string | null;
  lastPaymentDate: string | null;
  confidence: number;
  confidenceLabel: "high" | "medium" | "low";
  reasons: string[];
  evidenceCount: number;
  duplicateOf: { subscriptionId: number; name: string } | null;
  emailSender: string;
  emailSubject: string;
  selected: boolean;
}

interface CandidateCardProps {
  candidate: Candidate;
  onToggle: (id: string, selected: boolean) => void;
  onDismiss: (id: string) => void;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatBillingCycle(cycle: string | null): string {
  if (!cycle) return "Unknown cycle";
  return cycle
    .replace("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const CONFIDENCE_DOT: Record<string, string> = {
  high: "bg-success",
  medium: "bg-warning",
  low: "bg-muted-foreground",
};

export default function CandidateCard({
  candidate,
  onToggle,
  onDismiss,
}: CandidateCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-xl bg-card p-4 transition-all",
        !candidate.selected && "opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={candidate.selected}
          onCheckedChange={(checked) =>
            onToggle(candidate.id, !!checked)
          }
          className="mt-1"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                CONFIDENCE_DOT[candidate.confidenceLabel]
              )}
            />
            <h3 className="font-semibold text-base truncate">
              {candidate.merchantName}
            </h3>
            {candidate.catalogMatch && (
              <Badge variant="secondary" className="text-[10px]">
                Known service
              </Badge>
            )}
            {candidate.duplicateOf && (
              <Badge
                variant="outline"
                className="text-[10px] border-warning/30 text-warning"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Similar: {candidate.duplicateOf.name}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
            <span className="font-mono font-medium text-foreground">
              {formatCurrency(candidate.amount, candidate.currency)}
            </span>
            <span className="text-border">·</span>
            <span>{formatBillingCycle(candidate.billingCycle)}</span>
            {candidate.lastPaymentDate && (
              <>
                <span className="text-border">·</span>
                <span>
                  Last:{" "}
                  {new Date(
                    candidate.lastPaymentDate
                  ).toLocaleDateString()}
                </span>
              </>
            )}
            <span className="text-border">·</span>
            <span>
              {candidate.evidenceCount} email
              {candidate.evidenceCount !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Expand/collapse */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {expanded ? "Hide details" : "Why this was detected"}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 p-3 rounded-lg bg-muted/30 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Detection reasons:
                    </p>
                    <ul className="text-xs space-y-1">
                      {candidate.reasons.map((reason, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5"
                        >
                          <span className="text-muted-foreground">
                            •
                          </span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {candidate.emailSender && (
                    <div className="text-xs">
                      <span className="font-medium text-muted-foreground">
                        From:{" "}
                      </span>
                      <span className="font-mono">
                        {candidate.emailSender}
                      </span>
                    </div>
                  )}
                  {candidate.emailSubject && (
                    <div className="text-xs">
                      <span className="font-medium text-muted-foreground">
                        Subject:{" "}
                      </span>
                      <span className="truncate">
                        {candidate.emailSubject}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(candidate.id)}
          className="text-muted-foreground hover:text-destructive shrink-0"
        >
          Dismiss
        </Button>
      </div>
    </motion.div>
  );
}
