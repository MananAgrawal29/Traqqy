import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const CONFIDENCE_CONFIG = {
  high: {
    label: "High Confidence",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle2,
  },
  medium: {
    label: "Medium Confidence",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: AlertTriangle,
  },
  low: {
    label: "Low Confidence",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    icon: XCircle,
  },
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatBillingCycle(cycle: string | null): string {
  if (!cycle) return "Unknown cycle";
  return cycle.replace("_", "-").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CandidateCard({
  candidate,
  onToggle,
  onDismiss,
}: CandidateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = CONFIDENCE_CONFIG[candidate.confidenceLabel];
  const ConfidenceIcon = config.icon;

  return (
    <Card
      className={cn(
        "transition-all",
        !candidate.selected && "opacity-60",
        candidate.duplicateOf && "border-yellow-200 dark:border-yellow-800",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={candidate.selected}
            onCheckedChange={(checked) => onToggle(candidate.id, !!checked)}
            className="mt-1"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base truncate">
                {candidate.merchantName}
              </h3>
              <Badge variant="secondary" className={config.className}>
                <ConfidenceIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              {candidate.catalogMatch && (
                <Badge variant="outline" className="text-[10px]">
                  Known service
                </Badge>
              )}
              {candidate.duplicateOf && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Similar: {candidate.duplicateOf.name}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="font-mono font-medium text-foreground">
                {formatCurrency(candidate.amount, candidate.currency)}
              </span>
              <span>•</span>
              <span>{formatBillingCycle(candidate.billingCycle)}</span>
              {candidate.lastPaymentDate && (
                <>
                  <span>•</span>
                  <span>
                    Last:{" "}
                    {new Date(candidate.lastPaymentDate).toLocaleDateString()}
                  </span>
                </>
              )}
              <span>•</span>
              <span>{candidate.evidenceCount} emails</span>
            </div>

            {/* Expand/collapse details */}
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

            {expanded && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Detection reasons:
                  </p>
                  <ul className="text-xs space-y-1">
                    {candidate.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-muted-foreground">•</span>
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
                    <span className="font-mono">{candidate.emailSender}</span>
                  </div>
                )}
                {candidate.emailSubject && (
                  <div className="text-xs">
                    <span className="font-medium text-muted-foreground">
                      Subject:{" "}
                    </span>
                    <span className="truncate">{candidate.emailSubject}</span>
                  </div>
                )}
              </div>
            )}
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
      </CardContent>
    </Card>
  );
}
