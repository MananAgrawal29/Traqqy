import React, { useState } from "react";
import { 
  useListReminders, 
  useCreateReminder, 
  useUpdateReminder, 
  useDeleteReminder,
  useListSubscriptions,
  getListRemindersQueryKey,
  type Reminder
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bell, BellOff, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function Reminders() {
  const queryClient = useQueryClient();
  const { data: reminders, isLoading } = useListReminders();
  const { data: subscriptions } = useListSubscriptions({ status: 'active' });
  
  const createMut = useCreateReminder();
  const updateMut = useUpdateReminder();
  const deleteMut = useDeleteReminder();

  const [addOpen, setAddOpen] = useState(false);
  const [subId, setSubId] = useState<string>("");
  const [days, setDays] = useState<string>("3");

  const handleToggle = (reminder: Reminder, enabled: boolean) => {
    updateMut.mutate({ id: reminder.id, data: { isEnabled: enabled } }, {
      onSuccess: () => {
        toast.success(enabled ? "Reminder enabled" : "Reminder disabled");
        queryClient.setQueryData(getListRemindersQueryKey(), (old: Reminder[] | undefined) => 
          old?.map(r => r.id === reminder.id ? { ...r, isEnabled: enabled } : r)
        );
      },
      onError: () => toast.error("Failed to update reminder")
    });
  };

  const handleDelete = (id: number) => {
    deleteMut.mutate({ id }, {
      onSuccess: () => {
        toast.success("Reminder deleted");
        queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
      }
    });
  };

  const handleAdd = () => {
    if (!subId || !days) return;
    createMut.mutate({ 
      data: { 
        subscriptionId: Number(subId), 
        daysBefore: Number(days) as any,
        isEnabled: true
      } 
    }, {
      onSuccess: () => {
        toast.success("Reminder added");
        setAddOpen(false);
        setSubId("");
        queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
      },
      onError: () => toast.error("Failed to add reminder. Maybe it already exists?")
    });
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
          <p className="text-muted-foreground mt-1">Get notified before your subscriptions renew.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Reminder
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-6 w-10 bg-muted animate-pulse rounded-full" />
              </CardContent>
            </Card>
          ))
        ) : reminders && reminders.length > 0 ? (
          reminders.map(rem => (
            <Card key={rem.id} className={`transition-opacity ${!rem.isEnabled ? 'opacity-60' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className={`mt-0.5 rounded-full p-2 ${rem.isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {rem.isEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    </div>
                    <div>
                      <h3 className="font-semibold">{rem.subscriptionName || 'Unknown Subscription'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {rem.daysBefore} {rem.daysBefore === 1 ? 'day' : 'days'} before renewal
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Switch 
                      checked={rem.isEnabled} 
                      onCheckedChange={(c) => handleToggle(rem, c)} 
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(rem.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-16 text-center border rounded-xl border-dashed">
            <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No reminders set</h3>
            <p className="text-muted-foreground mb-6">Create reminders to never miss a cancellation window again.</p>
            <Button onClick={() => setAddOpen(true)} variant="outline">Create a Reminder</Button>
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reminder</DialogTitle>
            <DialogDescription>Choose a subscription and when you want to be notified.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subscription</Label>
              <Select value={subId} onValueChange={setSubId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subscription" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptions?.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
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
                  <SelectItem value="14">14 days before</SelectItem>
                  <SelectItem value="30">30 days before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!subId || createMut.isPending}>
              {createMut.isPending ? "Adding..." : "Add Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
