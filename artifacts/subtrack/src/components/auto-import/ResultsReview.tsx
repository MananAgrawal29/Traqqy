import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCheck, Download, RefreshCw } from "lucide-react";
import CandidateCard, { type Candidate } from "./CandidateCard";

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
      prev.map((c) => (c.id === id ? { ...c, selected } : c)),
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
    const selectedIds = items.filter((c) => c.selected).map((c) => c.id);
    onConfirm(selectedIds);
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground mb-4">
            No subscription candidates found in your emails.
          </p>
          <Button variant="outline" onClick={onRescan} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Scan Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Detected Subscriptions
                <Badge variant="secondary">{items.length}</Badge>
              </CardTitle>
              <CardDescription>
                Review and select which subscriptions to import. Scanned{" "}
                {summary.totalScanned} emails.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              <span className="font-medium text-green-600">{summary.highConfidence}</span> high
            </span>
            <span className="text-muted-foreground">
              <span className="font-medium text-yellow-600">{summary.mediumConfidence}</span> medium
            </span>
            <span className="text-muted-foreground">
              <span className="font-medium text-orange-600">{summary.lowConfidence}</span> low
            </span>
            {summary.duplicatesFound > 0 && (
              <span className="text-muted-foreground">
                <span className="font-medium text-yellow-600">{summary.duplicatesFound}</span> duplicates
              </span>
            )}
          </div>
          <Separator />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
              Deselect All
            </Button>
          </div>
        </CardContent>
      </Card>

      {items.map((candidate) => (
        <CandidateCard
          key={candidate.id}
          candidate={candidate}
          onToggle={handleToggle}
          onDismiss={handleDismiss}
        />
      ))}

      <Card className="sticky bottom-4 border-primary/20 shadow-lg">
        <CardContent className="p-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedCount} subscription{selectedCount !== 1 ? "s" : ""} selected for import
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onRescan} className="gap-2">
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
        </CardContent>
      </Card>
    </div>
  );
}
