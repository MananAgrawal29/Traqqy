import React, { useCallback, useEffect, useState } from "react";
import {
  useGetSettings,
  useUpdateSettings,
  useDeleteAccount,
  getGetSettingsQueryKey,
  getAutoImportStatus,
  startAutoImportScan,
  getScanStatus,
  getScanResults,
  confirmAutoImport,
  type UserSettingsUpdateTheme,
  type AutoImportStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail } from "lucide-react";

import ConnectionCard from "@/components/auto-import/ConnectionCard";
import ScanProgress from "@/components/auto-import/ScanProgress";
import ResultsReview from "@/components/auto-import/ResultsReview";
import type { Candidate } from "@/components/auto-import/CandidateCard";
import ImportSummary from "@/components/auto-import/ImportSummary";

// ── Auto Import types ──
// AutoImportStatus is imported from @workspace/api-client-react


interface ScanStatus {
  scanId: string;
  status: string;
  progress: {
    emailsFound: number;
    emailsProcessed: number;
    candidatesFound: number;
  };
  startedAt: string | null;
  updatedAt: string | null;
  errorMessage: string | null;
}

interface ScanResults {
  scanId: string;
  candidates: Candidate[];
  summary: {
    totalScanned: number;
    candidatesFound: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    duplicatesFound: number;
  };
}

interface ImportResult {
  imported: Array<{ subscriptionId: number; name: string; candidateId: string }>;
  failed: Array<{ candidateId: string; reason: string }>;
}

// ── Auto Import Tab Component ──

function AutoImportTab() {
  const [status, setStatus] = useState<AutoImportStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [scanResults, setScanResults] = useState<ScanResults | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Fetch connection status
  const fetchStatus = useCallback(async () => {
    try {
      const data = await getAutoImportStatus();
      setStatus(data);
    } catch {
      // Silently fail
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll scan status
  useEffect(() => {
    if (!scanId || !isScanning) return;

    const interval = setInterval(async () => {
      try {
        const data = await getScanStatus(scanId) as unknown as ScanStatus;
        setScanStatus(data);

        if (data.status === "complete" || data.status === "failed") {
          setIsScanning(false);
          clearInterval(interval);

          if (data.status === "complete") {
            // Fetch results
            const results = await getScanResults(scanId) as unknown as ScanResults;
            setScanResults(results);
          } else {
            toast.error(data.errorMessage || "Scan failed");
          }
        }
      } catch {
        // Retry on next interval
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [scanId, isScanning]);

  const handleScan = useCallback(async () => {
    setIsScanning(true);
    setScanResults(null);
    setImportResult(null);
    setScanStatus(null);

    try {
      const data = await startAutoImportScan({ monthsBack: 12 });
      setScanId(data.scanId ?? null);
    } catch {
      toast.error("Failed to start scan");
      setIsScanning(false);
    }
  }, []);

  const handleConfirm = useCallback(
    async (selectedIds: string[]) => {
      if (!scanId) return;
      setIsConfirming(true);

      try {
        const data = await confirmAutoImport({ scanId, candidateIds: selectedIds, overrides: {} });
        setImportResult(data as unknown as ImportResult);
        setScanResults(null);

        const imported = data.imported ?? [];
        const failed = data.failed ?? [];
        if (imported.length > 0) {
          toast.success(`${imported.length} subscription(s) imported!`);
        }
        if (failed.length > 0) {
          toast.error(`${failed.length} import(s) failed`);
        }
      } catch {
        toast.error("Failed to import subscriptions");
      } finally {
        setIsConfirming(false);
      }
    },
    [scanId],
  );

  if (statusLoading) {
    return <div className="text-muted-foreground">Loading auto-import status...</div>;
  }

  return (
    <div className="space-y-6">
      <ConnectionCard
        connected={status?.connected ?? false}
        email={status?.email ?? null}
        lastScanAt={status?.lastScanAt ?? null}
        onScan={handleScan}
        onDisconnect={() => window.location.reload()}
        isScanning={isScanning}
      />

      {isScanning && scanStatus && (
        <ScanProgress
          status={scanStatus.status}
          emailsFound={scanStatus.progress.emailsFound}
          emailsProcessed={scanStatus.progress.emailsProcessed}
          candidatesFound={scanStatus.progress.candidatesFound}
        />
      )}

      {scanResults && (
        <ResultsReview
          candidates={scanResults.candidates}
          summary={scanResults.summary}
          onConfirm={handleConfirm}
          onRescan={handleScan}
          isConfirming={isConfirming}
        />
      )}

      {importResult && (
        <ImportSummary
          imported={importResult.imported}
          failed={importResult.failed}
          onRescan={handleScan}
        />
      )}
    </div>
  );
}

// ── Main Settings Page ──

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateMut = useUpdateSettings();
  const deleteMut = useDeleteAccount();
  const { signOut } = useClerk();
  const { setTheme: setAppTheme, theme: appTheme } = useTheme();

  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [theme, setTheme] = useState<UserSettingsUpdateTheme>("system");
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (settings) {
      setDisplayName(settings.displayName || "");
      setCurrency(settings.currency || "INR");
      setTheme(settings.theme as UserSettingsUpdateTheme);
    }
  }, [settings]);

  const handleSaveProfile = () => {
    updateMut.mutate({ data: { displayName, currency } }, {
      onSuccess: () => {
        toast.success("Profile settings updated");
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      }
    });
  };

  const handleSaveAppearance = () => {
    updateMut.mutate({ data: { theme } }, {
      onSuccess: () => {
        toast.success("Appearance settings updated");
        setAppTheme(theme as "light" | "dark" | "system");
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      }
    });
  };

  const handleDeleteAccount = () => {
    deleteMut.mutate(undefined as void, {
      onSuccess: () => {
        toast.success("Account deleted");
        signOut({ redirectUrl: import.meta.env.BASE_URL || "/" });
      },
      onError: () => toast.error("Failed to delete account")
    });
  };

  if (isLoading) {
    return <div className="p-10 max-w-4xl mx-auto text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="auto-import">
            <Mail className="h-4 w-4 mr-1.5" />
            Auto Import
          </TabsTrigger>
          <TabsTrigger value="danger" className="text-destructive data-[state=active]:text-destructive">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>How we identify you in the app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD ($)</SelectItem>
                    <SelectItem value="AUD">AUD ($)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">This is the currency used for your dashboard summaries.</p>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSaveProfile} disabled={updateMut.isPending}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how Traqqy looks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={theme} onValueChange={(v) => setTheme(v as UserSettingsUpdateTheme)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSaveAppearance} disabled={updateMut.isPending}>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="auto-import" className="space-y-6">
          <AutoImportTab />
        </TabsContent>

        <TabsContent value="danger" className="space-y-6">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive">Delete Account</CardTitle>
              <CardDescription>
                Permanently remove your account and all associated data. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-destructive mb-4">
                Warning: This will delete all your tracked subscriptions, reminders, and historical data.
              </p>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                Delete My Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and remove your data from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? "Deleting..." : "Yes, Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
