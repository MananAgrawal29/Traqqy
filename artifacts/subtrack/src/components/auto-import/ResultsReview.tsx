import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCheck, Download, RefreshCw } from "lucide-react";
import CandidateCard, { type Candidate } from "./CandidateCard";
import { Reveal, staggerContainer, staggerItem } from "@/lib/motion";
import { motion, AnimatePresence } from "framer-motion";

interface ResultsReviewProps {
  candidates: Candidate[];
  summary: {
    totalScanned: number;
    candidatesFound: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    duplicatesFound: number;
  };
  onConfirm: (selectedIds: string[]) => void;
  onRescan: () => void;
  isConfirming: boolean;
}

export default function ResultsReview({
  candidates,
  summary,
  onConfirm,
  onRescan,
  isConfirming,
}: ResultsReviewProps) {
  const [items, setItems] = useState<Candidate[]>(candidates);

  const selectedCount = items.filter((c) => c.selected).length;

  const handleToggle = (id: string, selected: boolean) => {
    setItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected } : c))
    );
  };

  const handleDismiss = (id: string) => {
    setItems((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSelectAll = () => {
    setItems((prev) => prev.map((c) => ({ ...c, selected: true })));
  };

  const handleDeselectAll = () => {
    setItems((prev) => prev.map((c) => ({ ...c, selected: false })));
  };

  const handleConfirm = () => {
    const selectedIds = items
      .filter((c) => c.selected)
      .map((c) => c.id);
    onConfirm(selectedIds);
  };

  if (items.length === 0) {
    return (
      <Reveal>
        <div className="rounded-xl bg-card p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No subscription candidates found in your emails.
          </p>
          <Button
            variant="outline"
            onClick={onRescan}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Scan Again
          </Button>
        </div>
      </Reveal>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <Reveal>
        <div className="rounded-xl bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                We found{" "}
                <span className="text-primary">{items.length}</span>{" "}
                {items.length === 1 ? "subscription" : "subscriptions"}{" "}
                you might be paying for
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Scanned {summary.totalScanned} emails. Review and
                select which to import.
              </p>
            </div>
          </div>

          {/* Confidence summary */}
          <div className="flex items-center gap-4 text-sm">
            {summary.highConfidence > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="font-medium text-foreground">
                  {summary.highConfidence}
                </span>{" "}
                <span className="text-muted-foreground">strong</span>
              </span>
            )}
            {summary.mediumConfidence > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-warning" />
                <span className="font-medium text-foreground">
                  {summary.mediumConfidence}
                </span>{" "}
                <span className="text-muted-foreground">
                  likely
                </span>
              </span>
            )}
            {summary.lowConfidence > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                <span className="font-medium text-foreground">
                  {summary.lowConfidence}
                </span>{" "}
                <span className="text-muted-foreground">
                  uncertain
                </span>
              </span>
            )}
            {summary.duplicatesFound > 0 && (
              <span className="text-muted-foreground">
                {summary.duplicatesFound} duplicate
                {summary.duplicatesFound !== 1 ? "s" : ""} found
              </span>
            )}
          </div>

          {/* Select actions */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeselectAll}
              className="text-xs"
            >
              Deselect All
            </Button>
          </div>
        </div>
      </Reveal>

      {/* Candidate list */}
      <AnimatePresence mode="popLayout">
        {items.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            onToggle={handleToggle}
            onDismiss={handleDismiss}
          />
        ))}
      </AnimatePresence>

      {/* Sticky import bar */}
      <Reveal>
        <div className="sticky bottom-4 rounded-xl bg-card border border-primary/10 p-4 flex items-center justify-between shadow-lg">
          <p className="text-sm text-muted-foreground">
            {selectedCount} subscription
            {selectedCount !== 1 ? "s" : ""} selected for import
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onRescan}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Scan Again
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedCount === 0 || isConfirming}
              className="gap-2"
            >
              {isConfirming ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Import Selected ({selectedCount})
                </>
              )}
            </Button>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
