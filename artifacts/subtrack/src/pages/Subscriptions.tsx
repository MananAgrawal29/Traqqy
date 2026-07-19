import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Archive, ArchiveRestore, SlidersHorizontal, CreditCard } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import SubscriptionForm from "@/components/subscriptions/SubscriptionForm";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { stringToColor } from "@/components/subscriptions/CatalogPicker";
import { formatAmount } from "@/data/currencies";

function LogoDisplay({ logoUrl, name, size = "md" }: { logoUrl?: string; name: string; size?: "sm" | "md" }) {
  const [failed, setFailed] = React.useState(false);
  const dim = size === "sm" ? "h-9 w-9" : "h-12 w-12";
  if (logoUrl && !failed) {
    return (
      <div className={`${dim} rounded-xl border bg-white flex items-center justify-center p-1 shrink-0 overflow-hidden`}>
        <img src={logoUrl} alt={name} onError={() => setFailed(true)} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }
  return (
    <div className={`${dim} rounded-xl flex items-center justify-center shrink-0 font-bold text-white`}
      style={{ backgroundColor: stringToColor(name) }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

type SortOption = "name-asc" | "name-desc" | "price-desc" | "price-asc" | "renewal" | "recent";

export default function Subscriptions() {
  const [statusTab, setStatusTab] = useState<"active" | "archived" | "all">("active");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  
  const queryClient = useQueryClient();
  const { data: serverSubscriptions, isLoading } = useListSubscriptions({ 
    status: statusTab,
    search: debouncedSearch || undefined
  });
  
  const { data: categories } = useListCategories();

  // Sort and Filter States
  const [sortOption, setSortOption] = useState<SortOption>("renewal");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterCycle, setFilterCycle] = useState<string>("all");
  const [filterCurrency, setFilterCurrency] = useState<string>("all");

  const activeFilterCount = (filterCategory !== "all" ? 1 : 0) + 
                            (filterCycle !== "all" ? 1 : 0) + 
                            (filterCurrency !== "all" ? 1 : 0);

  const subscriptions = useMemo(() => {
    if (!serverSubscriptions) return [];
    
    // Filter
    let filtered = serverSubscriptions.filter(sub => {
      if (filterCategory !== "all" && sub.categoryId !== Number(filterCategory)) return false;
      if (filterCycle !== "all" && sub.billingCycle !== filterCycle) return false;
      if (filterCurrency !== "all" && sub.currency !== filterCurrency) return false;
      return true;
    });
    
    // Sort
    return filtered.sort((a, b) => {
      switch (sortOption) {
        case "name-asc": return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        case "price-desc": return (b.monthlyEquivalent || 0) - (a.monthlyEquivalent || 0);
        case "price-asc": return (a.monthlyEquivalent || 0) - (b.monthlyEquivalent || 0);
        case "renewal": {
          const aDate = new Date(a.renewalDate).getTime();
          const bDate = new Date(b.renewalDate).getTime();
          return aDate - bDate;
        }
        case "recent": {
          const aCreated = new Date(a.createdAt).getTime();
          const bCreated = new Date(b.createdAt).getTime();
          return bCreated - aCreated;
        }
        default: return 0;
      }
    });
  }, [serverSubscriptions, sortOption, filterCategory, filterCycle, filterCurrency]);

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
    deleteMutation.mutate({ id: deleteId }, {
      onSuccess: () => {
        toast.success("Subscription deleted");
        setDeleteId(null);
        queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
      onError: () => toast.error("Failed to delete subscription")
    });
  };

  const handleArchive = (id: number) => {
    archiveMutation.mutate({ id }, {
      onSuccess: () => {
        toast.success("Subscription archived");
        queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    });
  };

  const handleRestore = (id: number) => {
    restoreMutation.mutate({ id }, {
      onSuccess: () => {
        toast.success("Subscription restored");
        queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    });
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto flex flex-col h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground mt-1">Manage all your recurring expenses in one place.</p>
        </div>
        <Button onClick={handleCreateOrEdit} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Add Subscription
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as any)} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:max-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="renewal">Renewal Date</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="price-desc">Price (High to Low)</SelectItem>
                <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                <SelectItem value="recent">Recently Added</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 relative">
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Filters</h4>
                    <p className="text-sm text-muted-foreground">
                      Refine your subscription list.
                    </p>
                  </div>
                  
                  <div className="grid gap-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium">Category</label>
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories?.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium">Billing Cycle</label>
                      <Select value={filterCycle} onValueChange={setFilterCycle}>
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

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium">Currency</label>
                      <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any Currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Currencies</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="CAD">CAD</SelectItem>
                          <SelectItem value="AUD">AUD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      setFilterCategory("all");
                      setFilterCycle("all");
                      setFilterCurrency("all");
                    }} className="mt-2 text-xs">
                      Clear Filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-5 flex gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : subscriptions && subscriptions.length > 0 ? (
          subscriptions.map(sub => (
            <Card key={sub.id} className={`overflow-hidden transition-all hover:shadow-md ${sub.isArchived ? 'opacity-70 grayscale-[0.5]' : ''} ${!sub.isActive && !sub.isArchived ? 'opacity-80' : ''}`}>
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-center min-w-0">
                    <LogoDisplay logoUrl={sub.logoUrl ?? undefined} name={sub.name} />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-lg leading-tight truncate">{sub.name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {sub.categoryName && (
                          <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0 truncate max-w-[100px]">
                            {sub.categoryName}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">{sub.billingCycle.replace('_', ' ')}</Badge>
                        {sub.isArchived && <Badge variant="outline" className="text-[10px] bg-muted">Archived</Badge>}
                        {!sub.isActive && !sub.isArchived && <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">Inactive</Badge>}
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-8 w-8 text-muted-foreground shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(sub)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      {sub.isArchived ? (
                        <DropdownMenuItem onClick={() => handleRestore(sub.id)}>
                          <ArchiveRestore className="mr-2 h-4 w-4" /> Restore
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleArchive(sub.id)}>
                          <Archive className="mr-2 h-4 w-4" /> Archive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(sub.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex justify-between items-end mt-auto pt-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-muted-foreground">Renews {format(new Date(sub.renewalDate), 'MMM d, yyyy')}</p>
                    <p className="text-xs font-medium">
                      {!sub.isArchived && sub.daysUntilRenewal !== null && sub.daysUntilRenewal !== undefined ? (
                        <span className={
                          sub.daysUntilRenewal <= 3 ? "text-destructive" :
                          sub.daysUntilRenewal <= 7 ? "text-orange-500" : "text-green-600"
                        }>
                          {sub.daysUntilRenewal === 0 ? "Today" : 
                           sub.daysUntilRenewal === 1 ? "Tomorrow" : 
                           `In ${sub.daysUntilRenewal} days`}
                        </span>
                      ) : sub.isArchived ? "Archived" : "Not tracking"}
                    </p>
                    {sub.paymentMethod && (
                      <div className="flex items-center gap-1 mt-1 text-muted-foreground/70">
                        <CreditCard className="w-3 h-3" />
                        <span className="text-[10px] truncate max-w-[100px]">{sub.paymentMethod}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold font-mono tracking-tight">{formatAmount(sub.price, sub.currency)}</p>
                    <p className="text-xs text-muted-foreground capitalize">/{sub.currency}</p>
                    {sub.billingCycle !== "monthly" && sub.monthlyEquivalent ? (
                      <p className="text-[10px] text-muted-foreground mt-0.5">≈ {formatAmount(sub.monthlyEquivalent, sub.currency)}/mo</p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-16 text-center border rounded-xl border-dashed">
            <h3 className="text-lg font-medium mb-2">No subscriptions found</h3>
            <p className="text-muted-foreground mb-6">You don't have any {statusTab !== 'all' ? statusTab : ''} subscriptions tracking right now.</p>
            <Button onClick={handleCreateOrEdit}>Add Your First Subscription</Button>
          </div>
        )}
      </div>

      <SubscriptionForm 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        subscription={editingSub} 
      />

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the subscription and its history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
