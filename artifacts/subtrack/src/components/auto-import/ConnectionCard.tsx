import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Unplug, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getGoogleAuthUrl, disconnectGmail } from "@workspace/api-client-react";
import { Reveal } from "@/lib/motion";

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

      const popup = window.open(
        url,
        "gmail-auth",
        "width=500,height=600,scrollbars=yes,resizable=yes"
      );

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

      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handler);
          setConnecting(false);
        }
      }, 500);
    } catch {
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
      <Reveal>
        <div className="rounded-xl bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Connect Gmail</h3>
              <p className="text-sm text-muted-foreground">
                Automatically detect subscriptions from your emails.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-success/5 border border-success/10">
            <ShieldCheck className="h-4 w-4 text-success mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">
                Read-only access
              </p>
              <ul className="space-y-0.5">
                <li>• Traqqy only reads email headers and snippets</li>
                <li>• Your full email content is never stored</li>
                <li>• Only subscription-relevant data is kept</li>
                <li>• You can disconnect at any time</li>
              </ul>
            </div>
          </div>

          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="gap-2"
          >
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
        </div>
      </Reveal>
    );
  }

  return (
    <Reveal>
      <div className="rounded-xl bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Gmail Connected</h3>
            <p className="text-sm text-muted-foreground">
              Ready for scanning.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/10">
          <div className="h-2 w-2 rounded-full bg-success shrink-0" />
          <div>
            <p className="text-sm font-medium">{email}</p>
            {lastScanAt && (
              <p className="text-xs text-muted-foreground">
                Last scan:{" "}
                {new Date(lastScanAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
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
        </div>
      </div>
    </Reveal>
  );
}
