import React, { useCallback, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Unplug, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getGoogleAuthUrl, disconnectGmail } from "@workspace/api-client-react";

interface ConnectionCardProps {
  connected: boolean;
  email: string | null;
  lastScanAt: string | null;
  onScan: () => void;
  onDisconnect: () => void;
  isScanning: boolean;
}

export default function ConnectionCard({
  connected,
  email,
  lastScanAt,
  onScan,
  onDisconnect,
  isScanning,
}: ConnectionCardProps) {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const data = await getGoogleAuthUrl();
      const url = data.url;
      if (!url) throw new Error("No auth URL returned");

      // Open popup
      const popup = window.open(
        url,
        "gmail-auth",
        "width=500,height=600,scrollbars=yes,resizable=yes",
      );

      // Listen for postMessage from callback
      const handler = (event: MessageEvent) => {
        if (event.data?.type === "traqqy-gmail-auth") {
          window.removeEventListener("message", handler);
          popup?.close();

          if (event.data.status === "success") {
            toast.success("Gmail connected successfully!");
            window.location.reload();
          } else {
            toast.error(event.data.message || "Failed to connect Gmail");
          }
        }
      };
      window.addEventListener("message", handler);

      // Cleanup if popup is closed manually
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handler);
          setConnecting(false);
        }
      }, 500);
    } catch (err) {
      toast.error("Failed to start Gmail connection");
      setConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    try {
      await disconnectGmail();
      toast.success("Gmail disconnected");
      window.location.reload();
    } catch {
      toast.error("Failed to disconnect Gmail");
    } finally {
      setDisconnecting(false);
    }
  }, []);

  if (!connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Connect Gmail
          </CardTitle>
          <CardDescription>
            Connect your Gmail account to automatically detect subscriptions from your emails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Privacy-first approach</p>
              <ul className="text-muted-foreground space-y-0.5">
                <li>• Traqqy only reads email headers and snippets</li>
                <li>• Your full email content is never stored</li>
                <li>• Only subscription-relevant data is kept</li>
                <li>• You can disconnect at any time</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Traqqy will request read-only access to your Gmail. It cannot send, modify, or delete emails.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleConnect} disabled={connecting} className="gap-2">
            {connecting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Connect Gmail
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-green-600" />
          Gmail Connected
        </CardTitle>
        <CardDescription>
          Your Gmail account is connected and ready for scanning.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
          <div>
            <p className="text-sm font-medium">{email}</p>
            {lastScanAt && (
              <p className="text-xs text-muted-foreground">
                Last scan: {new Date(lastScanAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={onScan} disabled={isScanning} className="gap-2">
          {isScanning ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            "Scan for Subscriptions"
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <Unplug className="h-4 w-4" />
          Disconnect
        </Button>
      </CardFooter>
    </Card>
  );
}
