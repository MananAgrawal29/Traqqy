import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Link } from "wouter";

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {imported.length > 0 ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
          Import {imported.length > 0 ? "Complete" : "Failed"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {imported.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {imported.length} subscription{imported.length !== 1 ? "s" : ""} imported:
            </p>
            {imported.map((item) => (
              <div
                key={item.candidateId}
                className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20"
              >
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-sm">{item.name}</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  ID: {item.subscriptionId}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {failed.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-destructive">
              {failed.length} failed:
            </p>
            {failed.map((item) => (
              <div
                key={item.candidateId}
                className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20"
              >
                <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span className="text-sm text-destructive">{item.reason}</span>
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
      </CardContent>
    </Card>
  );
}
