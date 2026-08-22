import React, { useState, useEffect, useMemo } from "react";
import {
  useListSubscriptions,
  useCreateSubscription,
  useUpdateSubscription,
  useDeleteSubscription,
  useArchiveSubscription,
  useRestoreSubscription,
  useListCategories,
  getListSubscriptionsQueryKey,
  getGetDashboardSummaryQueryKey,
  type Subscription,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import SubscriptionForm from "@/components/subscriptions/SubscriptionForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Reveal, staggerContainer, staggerItem } from "@/lib/motion";
import { motion, AnimatePresence } from "framer-motion";
import SubscriptionRow from "@/components/subscriptions/SubscriptionRow";

type SortOption =
  | "name-asc"
  | "name-desc"
  | "price-desc"
  | "price-asc"
  | "renewal"
  | "recent";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Subscriptions() {
  const [statusTab, setStatusTab] = useState<"active" | "archived" | "all">(
    "active"
  );
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const queryClient = useQueryClient();
  const { data: serverSubscriptions, isLoading } = useListSubscriptions({
    status: statusTab,
    search: debouncedSearch || undefined,
  });

  const { data: categories } = useListCategories();

  const [sortOption, setSortOption] = useState<SortOption>("renewal");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterCycle, setFilterCycle] = useState<string>("all");

  const activeFilterCount =
    (filterCategory !== "all" ? 1 : 0) + (filterCycle !== "all" ? 1 : 0);

  const subscriptions = useMemo(() => {
    if (!serverSubscriptions) return [];

    let filtered = serverSubscriptions.filter((sub) => {
      if (filterCategory !== "all" && sub.categoryId !== Number(filterCategory))
        return false;
      if (filterCycle !== "all" && sub.billingCycle !== filterCycle) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-desc":
          return (b.monthlyEquivalent || 0) - (a.monthlyEquivalent || 0);
        case "price-asc":
          return (a.monthlyEquivalent || 0) - (b.monthlyEquivalent || 0);
        case "renewal":
          return (
            new Date(a.renewalDate).getTime() -
            new Date(b.renewalDate).getTime()
          );
        case "recent":
          return (
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
          );
        default:
          return 0;
      }
    });
  }, [serverSubscriptions, sortOption, filterCategory, filterCycle]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const deleteMutation = useDeleteSubscription();
  const archiveMutation = useArchiveSubscription();
  const restoreMutation = useRestoreSubscription();

  const handleCreateOrEdit = () => {
    setEditingSub(null);
    setFormOpen(true);
  };
  const handleEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setFormOpen(true);
  };
  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast.success("Subscription deleted");
          setDeleteId(null);
          queryClient.invalidateQueries({
            queryKey: getListSubscriptionsQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetDashboardSummaryQueryKey(),
          });
        },
        onError: () => toast.error("Failed to delete subscription"),
      }
    );
  };
  const handleArchive = (id: number) => {
    archiveMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Subscription archived");
          queryClient.invalidateQueries({
            queryKey: getListSubscriptionsQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetDashboardSummaryQueryKey(),
          });
        },
      }
    );
  };
  const handleRestore = (id: number) => {
    restoreMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Subscription restored");
          queryClient.invalidateQueries({
            queryKey: getListSubscriptionsQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetDashboardSummaryQueryKey(),
          });
        },
      }
    );
  };

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-5xl mx-auto flex flex-col h-full">
      {/* Header */}
      <Reveal>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Subscriptions
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage all your recurring expenses in one place.
            </p>
          </div>
          <Button onClick={handleCreateOrEdit} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Add Subscription
          </Button>
        </div>
      </Reveal>

      {/* Filter bar */}
      <Reveal delay={0.05}>
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <Tabs
            value={statusTab}
            onValueChange={(v) => setStatusTab(v as any)}
            className="w-full sm:w-auto"
          >
            <TabsList>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:max-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select
              value={sortOption}
              onValueChange={(v) => setSortOption(v as SortOption)}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="renewal">Renewal Date</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="price-desc">Price (High→Low)</SelectItem>
                <SelectItem value="price-asc">Price (Low→High)</SelectItem>
                <SelectItem value="recent">Recently Added</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 relative">
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Filters</h4>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Category
                    </label>
                    <Select
                      value={filterCategory}
                      onValueChange={setFilterCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories?.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Billing Cycle
                    </label>
                    <Select
                      value={filterCycle}
                      onValueChange={setFilterCycle}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any Cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Cycles</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterCategory("all");
                        setFilterCycle("all");
                      }}
                      className="mt-1 text-xs"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Reveal>

      {/* Subscription list */}
      <div className="flex-1">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3.5 px-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : subscriptions && subscriptions.length > 0 ? (
          <div>
            <AnimatePresence mode="popLayout">
              {subscriptions.map((sub) => (
                <SubscriptionRow
                  key={sub.id}
                  subscription={sub}
                  onEdit={handleEdit}
                  onArchive={handleArchive}
                  onRestore={handleRestore}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="py-20 text-center border border-dashed border-border/50 rounded-xl">
            <h3 className="text-lg font-medium mb-2">
              No subscriptions found
            </h3>
            <p className="text-muted-foreground mb-6 text-sm">
              You don&apos;t have any{" "}
              {statusTab !== "all" ? statusTab : ""} subscriptions tracking
              right now.
            </p>
            <Button onClick={handleCreateOrEdit}>Add Your First Subscription</Button>
          </div>
        )}
      </div>

      <SubscriptionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        subscription={editingSub}
      />

      <Dialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete the subscription and its history.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
