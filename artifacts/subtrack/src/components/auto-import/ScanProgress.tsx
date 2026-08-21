import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ScanProgressProps {
  status: string;
  emailsFound: number;
  emailsProcessed: number;
  candidatesFound: number;
}

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued...",
  searching: "Searching your inbox for subscription-related emails...",
  analyzing: "Analyzing email content and extracting transaction data...",
  scoring: "Detecting patterns and scoring candidates...",
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isActive ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <div className={`h-5 w-5 rounded-full ${status === "complete" ? "bg-green-500" : "bg-red-500"}`} />
          )}
          {STATUS_LABELS[status] || status}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progressPercent} className="h-2" />

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold font-mono">{emailsFound}</p>
            <p className="text-xs text-muted-foreground">Emails found</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono">{emailsProcessed}</p>
            <p className="text-xs text-muted-foreground">Processed</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono">{candidatesFound}</p>
            <p className="text-xs text-muted-foreground">Candidates</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
