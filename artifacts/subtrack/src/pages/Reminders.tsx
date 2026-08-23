import React, { useState } from "react";
import {
  useListReminders,
  useCreateReminder,
  useUpdateReminder,
  useDeleteReminder,
  useListSubscriptions,
  getListRemindersQueryKey,
  type Reminder,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bell, BellOff, Plus, Trash2, Check, AlertCircle, Clock, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Reveal, staggerContainer, staggerItem } from "@/lib/motion";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";


function StatusBadge({ status }: { status?: string | null }) {
  if (!status || status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
        <Clock className="h-3 w-3" />
        Scheduled
      </span>
    );
  }
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
        <Check className="h-3 w-3" />
        Sent
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
        <AlertCircle className="h-3 w-3" />
        Failed
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
        <XCircle className="h-3 w-3" />
        Cancelled
      </span>
    );
  }
  return null;
}

function formatScheduledDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export default function Reminders() {
  const queryClient = useQueryClient();
  const { data: reminders, isLoading } = useListReminders();
  const { data: subscriptions } = useListSubscriptions({
    status: "active",
  });

  const createMut = useCreateReminder();
  const updateMut = useUpdateReminder();
  const deleteMut = useDeleteReminder();

  const [addOpen, setAddOpen] = useState(false);
  const [subId, setSubId] = useState<string>("");
  const [days, setDays] = useState<string>("3");

  const handleToggle = (reminder: Reminder, enabled: boolean) => {
    updateMut.mutate(
      { id: reminder.id, data: { isEnabled: enabled } },
      {
        onSuccess: () => {
          toast.success(
            enabled ? "Reminder enabled" : "Reminder disabled"
          );
          queryClient.setQueryData(
            getListRemindersQueryKey(),
            (old: Reminder[] | undefined) =>
              old?.map((r) =>
                r.id === reminder.id ? { ...r, isEnabled: enabled } : r
              )
          );
        },
        onError: () => toast.error("Failed to update reminder"),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMut.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Reminder deleted");
          queryClient.invalidateQueries({
            queryKey: getListRemindersQueryKey(),
          });
        },
      }
    );
  };

  const handleAdd = () => {
    if (!subId || !days) return;
    createMut.mutate(
      {
        data: {
          subscriptionId: Number(subId),
          daysBefore: Number(days) as any,
          isEnabled: true,
        },
      },
      {
        onSuccess: () => {
          toast.success("Reminder added");
          setAddOpen(false);
          setSubId("");
          queryClient.invalidateQueries({
            queryKey: getListRemindersQueryKey(),
          });
        },
        onError: () =>
          toast.error("Failed to add reminder. Maybe it already exists?"),
      }
    );
  };

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-4xl mx-auto">
      <Reveal>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Reminders
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Get notified before your subscriptions renew.
            </p>
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Add Reminder
          </Button>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 py-4 animate-pulse"
                >
                  <div className="h-8 w-8 bg-muted rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                  <div className="h-6 w-10 bg-muted rounded-full" />
                </div>
              ))}
            </div>
          ) : reminders && reminders.length > 0 ? (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="divide-y divide-border/50"
            >
              <AnimatePresence mode="popLayout">
                {reminders.map((rem) => (
                  <motion.div
                    key={rem.id}
                    variants={staggerItem}
                    layout
                    exit={{ opacity: 0, x: -8 }}
                    className={`flex items-center gap-4 py-4 group hover:bg-accent/5 -mx-3 px-3 rounded-lg transition-colors ${
                      !rem.isEnabled ? "opacity-50" : ""
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                        rem.isEnabled
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {rem.isEnabled ? (
                        <Bell className="h-4 w-4" />
                      ) : (
                        <BellOff className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {rem.subscriptionName ||
                          "Unknown Subscription"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {rem.daysBefore}{" "}
                        {rem.daysBefore === 1 ? "day" : "days"}{" "}
                        before renewal
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Switch
                        checked={rem.isEnabled}
                        onCheckedChange={(c) =>
                          handleToggle(rem, c)
                        }
                      />
                      <button
                        className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(rem.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="py-20 text-center border border-dashed border-border/50 rounded-xl">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium mb-1">
                No reminders set
              </h3>
              <p className="text-sm text-muted-foreground mb-5">
                Create reminders to never miss a cancellation
                window again.
              </p>
              <Button
                onClick={() => setAddOpen(true)}
                variant="outline"
              >
                Create a Reminder
              </Button>
            </div>
          )}
        </div>
      </Reveal>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reminder</DialogTitle>
            <DialogDescription>
              Choose a subscription and when you want to be
              notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Subscription</Label>
              <Select value={subId} onValueChange={setSubId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subscription" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptions?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>When to notify</Label>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger>
                  <SelectValue placeholder="Select days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day before</SelectItem>
                  <SelectItem value="3">3 days before</SelectItem>
                  <SelectItem value="7">7 days before</SelectItem>
                  <SelectItem value="14">
                    14 days before
                  </SelectItem>
                  <SelectItem value="30">
                    30 days before
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!subId || createMut.isPending}
            >
              {createMut.isPending
                ? "Adding..."
                : "Add Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
