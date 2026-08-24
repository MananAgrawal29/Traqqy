import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Search } from "lucide-react";
import {
  useCreateSubscription,
  useUpdateSubscription,
  useListCategories,
  getListSubscriptionsQueryKey,
  getGetDashboardSummaryQueryKey,
  type Subscription,
  SubscriptionInputBillingCycle
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import CurrencySelect from "./CurrencySelect";
import CatalogPicker from "./CatalogPicker";
import SubscriptionLogo from "./SubscriptionLogo";
import { catalog, type CatalogEntry } from "@/data/catalog";
import { formatAmount } from "@/data/currencies";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  icon: z.string().optional().or(z.literal("")),
  categoryId: z.coerce.number().optional().nullable(),
  price: z.coerce.number().min(0, "Price must be positive"),
  currency: z.string().min(1),
  billingCycle: z.nativeEnum(SubscriptionInputBillingCycle),
  renewalDate: z.string().optional().or(z.literal("")),
  paymentMethod: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  subscriptionType: z.enum(["recurring", "trial", "lifetime"]).default("recurring"),
  trialEndsAt: z.string().optional().or(z.literal("")),
  trialConvertsToRecurring: z.boolean().optional().default(false),
  recurringPrice: z.coerce.number().optional(),
  recurringBillingCycle: z.nativeEnum(SubscriptionInputBillingCycle).optional(),
  purchaseDate: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.subscriptionType === "recurring") {
    if (!data.billingCycle) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Billing cycle is required", path: ["billingCycle"] });
    if (!data.renewalDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Renewal date is required", path: ["renewalDate"] });
  } else if (data.subscriptionType === "trial") {
    if (!data.trialEndsAt) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Trial end date is required", path: ["trialEndsAt"] });
    if (data.trialConvertsToRecurring) {
      if (data.recurringPrice === undefined || data.recurringPrice === null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Recurring price is required", path: ["recurringPrice"] });
      if (!data.recurringBillingCycle) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Recurring billing cycle is required", path: ["recurringBillingCycle"] });
    }
  } else if (data.subscriptionType === "lifetime") {
    if (!data.purchaseDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Purchase date is required", path: ["purchaseDate"] });
  }
});

type FormValues = z.infer<typeof formSchema>;

export default function SubscriptionForm({ 
  open, 
  onOpenChange, 
  subscription 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  subscription?: Subscription | null;
}) {
  const queryClient = useQueryClient();
  const createMut = useCreateSubscription();
  const updateMut = useUpdateSubscription();
  const { data: categories } = useListCategories();

  const isEditing = !!subscription;
  
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedCatalogEntry, setSelectedCatalogEntry] = useState<CatalogEntry | null>(null);
  const [subscriptionType, setSubscriptionType] = useState<"recurring" | "trial" | "lifetime">("recurring");
  const [isShared, setIsShared] = useState(false);
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [shares, setShares] = useState<{ name: string; amount: number; isCurrentUser: boolean }[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      icon: "",
      categoryId: undefined,
      price: 0,
      currency: "INR",
      billingCycle: "monthly",
      renewalDate: format(new Date(), "yyyy-MM-dd"),
      paymentMethod: "",
      notes: "",
      isActive: true,
      subscriptionType: "recurring",
      trialEndsAt: "",
      trialConvertsToRecurring: false,
      recurringPrice: undefined,
      recurringBillingCycle: undefined,
      purchaseDate: format(new Date(), "yyyy-MM-dd"),
    }
  });

  useEffect(() => {
    if (open) {
      if (subscription) {
        form.reset({
          name: subscription.name,
          icon: subscription.icon || "",
          categoryId: subscription.categoryId,
          price: subscription.price,
          currency: subscription.currency,
          billingCycle: subscription.billingCycle as any,
          renewalDate: subscription.renewalDate || undefined,
          paymentMethod: subscription.paymentMethod || "",
          notes: subscription.notes || "",
          isActive: subscription.isActive,
          subscriptionType: subscription.subscriptionType || "recurring",
          trialEndsAt: subscription.trialEndsAt || "",
          trialConvertsToRecurring: subscription.trialConvertsToRecurring ?? false,
          recurringPrice: subscription.recurringPrice ?? undefined,
          recurringBillingCycle: subscription.recurringBillingCycle || undefined,
          purchaseDate: subscription.purchaseDate || "",
        });
        
        // Try to match with catalog
        const match = catalog.find(c => c.name.toLowerCase() === subscription.name.toLowerCase());
        if (match) setSelectedCatalogEntry(match);
        setSubscriptionType(subscription.subscriptionType || "recurring");
        // Load sharing data
        setIsShared(subscription.isShared || false);
        setSplitMode(subscription.splitMode || "equal");
        setShares(subscription.shares || []);
      } else {
        form.reset({
          name: "",
          icon: "",
          categoryId: undefined,
          price: 0,
          currency: "INR",
          billingCycle: "monthly",
          renewalDate: format(new Date(), "yyyy-MM-dd"),
          paymentMethod: "",
          notes: "",
          isActive: true,
        });
        setIsShared(false);
        setSplitMode("equal");
        setShares([]);
      }
    } else {
      setSelectedCatalogEntry(null);
      setSubscriptionType("recurring");
      setIsShared(false);
      setSplitMode("equal");
      setShares([]);
    }
  }, [open, subscription, form]);

  const handleCatalogSelect = (entry: CatalogEntry) => {
    setSelectedCatalogEntry(entry);
    form.setValue("name", entry.name);
    form.setValue("icon", entry.icon);
    form.setValue("billingCycle", entry.defaultBillingCycle as any);
    
    // Match category by name
    const matchedCat = categories?.find(c => c.name === entry.category);
    if (matchedCat) form.setValue("categoryId", matchedCat.id);
    
    setCatalogOpen(false);
  };

  const onSubmit = (data: FormValues) => {
    const isTrial = data.subscriptionType === "trial";
    const isLifetime = data.subscriptionType === "lifetime";
    const isTrialConverts = isTrial && data.trialConvertsToRecurring;

    // Compute shares with amounts for equal split
    const finalShares = isShared ? shares.map((s, i) => {
      if (splitMode === "equal" && priceNum > 0) {
        const count = shares.length;
        const amounts = [];
        const base = Math.floor(priceNum * 100 / count) / 100;
        let rem = Math.round((priceNum - base * count) * 100);
        for (let j = 0; j < count; j++) {
          let amt = base;
          if (j >= count - rem) amt = Math.round((amt + 0.01) * 100) / 100;
          amounts.push(amt);
        }
        return { ...s, amount: amounts[i] };
      }
      return s;
    }) : [];

    // Build clean payload per subscription type
    const payload = {
      ...data,
      categoryId: data.categoryId ?? undefined,
      subscriptionType: data.subscriptionType,
      // Recurring: keep renewalDate + billingCycle as-is
      // Trial: no renewalDate, billingCycle stays as DB-required default
      // Lifetime: no renewalDate
      renewalDate: data.subscriptionType === "recurring" ? (data.renewalDate || undefined) : undefined,
      // Trial fields
      trialEndsAt: isTrial ? (data.trialEndsAt || undefined) : null,
      trialConvertsToRecurring: isTrial ? data.trialConvertsToRecurring : null,
      // Recurring-after-trial fields: only when trial converts
      recurringPrice: isTrialConverts ? data.recurringPrice : null,
      recurringBillingCycle: isTrialConverts ? (data.recurringBillingCycle || null) : null,
      // Lifetime
      purchaseDate: isLifetime ? (data.purchaseDate || undefined) : null,
      // Sharing
      isShared: isShared,
      splitMode: splitMode,
      shares: isShared ? finalShares : [],
    };

    if (isEditing) {
      updateMut.mutate({ id: subscription.id, data: payload }, {
        onSuccess: () => {
          toast.success("Subscription updated");
          queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to update subscription")
      });
    } else {
      createMut.mutate({ data: payload }, {
        onSuccess: () => {
          toast.success("Subscription created");
          queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to create subscription")
      });
    }
  };

  const watchSubType = form.watch("subscriptionType") as "recurring" | "trial" | "lifetime";
  const activeType = watchSubType;
  const watchPrice = form.watch("price");
  const watchCycle = form.watch("billingCycle");
  const watchCurrency = form.watch("currency");
  
  const priceNum = Number(watchPrice) || 0;
  const monthlyEq = priceNum > 0 ?
    watchCycle === 'monthly' ? priceNum :
    watchCycle === 'yearly' ? priceNum / 12 :
    watchCycle === 'weekly' ? priceNum * 52 / 12 :
    watchCycle === 'quarterly' ? priceNum / 3 :
    watchCycle === 'semi_annual' ? priceNum / 6 : 0
  : 0;

  // Equal split amount for a given index
  const getEqualAmount = (idx: number) => {
    if (priceNum <= 0 || shares.length === 0) return "";
    const base = Math.floor(priceNum * 100 / shares.length) / 100;
    const rem = Math.round((priceNum - base * shares.length) * 100);
    const amt = idx >= shares.length - rem ? base + 0.01 : base;
    return amt.toFixed(2);
  };

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEditing ? "Edit Subscription" : "Add Subscription"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update details for this subscription." : "Track a new subscription expense."}
          </SheetDescription>
        </SheetHeader>

        {!isEditing && (
          <div className="mb-6">
            {selectedCatalogEntry ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <SubscriptionLogo icon={selectedCatalogEntry.icon} name={selectedCatalogEntry.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{selectedCatalogEntry.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedCatalogEntry.category}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => { 
                  setSelectedCatalogEntry(null); 
                  form.setValue("name", ""); 
                  form.setValue("icon", ""); 
                }}>
                  Change
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full gap-2" onClick={() => setCatalogOpen(true)}>
                <Search className="h-4 w-4" /> Browse Catalog
              </Button>
            )}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subscription Type</label>
              <Tabs value={subscriptionType} onValueChange={(v)=>{const t=v as "recurring"|"trial"|"lifetime";setSubscriptionType(t);form.setValue("subscriptionType",t);if(t==="recurring"){form.setValue("trialEndsAt","");form.setValue("trialConvertsToRecurring",false);form.setValue("recurringPrice",undefined);form.setValue("recurringBillingCycle",undefined);form.setValue("purchaseDate","");}else if(t==="trial"){form.setValue("renewalDate","");form.setValue("purchaseDate","");form.setValue("trialEndsAt",format(new Date(),"yyyy-MM-dd"));form.setValue("trialConvertsToRecurring",false);form.setValue("recurringPrice",undefined);form.setValue("recurringBillingCycle",undefined);}else{form.setValue("renewalDate","");form.setValue("trialEndsAt","");form.setValue("trialConvertsToRecurring",false);form.setValue("recurringPrice",undefined);form.setValue("recurringBillingCycle",undefined);form.setValue("purchaseDate",format(new Date(),"yyyy-MM-dd"));}}}><TabsList className="w-full"><TabsTrigger value="recurring" className="flex-1">Recurring</TabsTrigger><TabsTrigger value="trial" className="flex-1">Free Trial</TabsTrigger><TabsTrigger value="lifetime" className="flex-1">Lifetime</TabsTrigger></TabsList></Tabs>
            </div>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Netflix" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="15.99" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <CurrencySelect value={field.value} onValueChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Recurring */}
              {activeType === "recurring" && (<div className="grid grid-cols-2 gap-4"><FormField control={form.control} name="billingCycle" render={({field})=><FormItem><FormLabel>Billing Cycle</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select cycle" /></SelectTrigger></FormControl><SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="semi_annual">Semi-Annual</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent></Select><FormMessage /></FormItem>} /><FormField control={form.control} name="renewalDate" render={({field})=><FormItem><FormLabel>Next Renewal *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} /></div>)}
              {/* Trial */}
              {activeType === "trial" && (<><FormField control={form.control} name="trialEndsAt" render={({field})=><FormItem><FormLabel>Trial Ends *</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><p className="text-xs text-muted-foreground">When does the trial period end?</p><FormMessage /></FormItem>} /><FormField control={form.control} name="trialConvertsToRecurring" render={({field})=><FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><div className="space-y-0.5"><FormLabel className="text-sm">Converts to recurring</FormLabel><div className="text-xs text-muted-foreground">Will this trial become a paid subscription?</div></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>} />{form.watch("trialConvertsToRecurring") && (<div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20"><FormField control={form.control} name="recurringPrice" render={({field})=><FormItem><FormLabel>Recurring Price</FormLabel><FormControl><Input type="number" step="0.01" min="0" placeholder="After trial" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="recurringBillingCycle" render={({field})=><FormItem><FormLabel>Billing Cycle</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Select cycle" /></SelectTrigger></FormControl><SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="semi_annual">Semi-Annual</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent></Select><FormMessage /></FormItem>} /></div>)}</>)}
              {/* Lifetime */}
              {activeType === "lifetime" && (<FormField control={form.control} name="purchaseDate" render={({field})=><FormItem><FormLabel>Purchase Date *</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><p className="text-xs text-muted-foreground">One-time purchase - no renewal.</p><FormMessage /></FormItem>} />)}

              
              {/* Cost Sharing */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sharing</label>
                <Tabs value={isShared ? "shared" : "personal"} onValueChange={(v) => {
                  const shared = v === "shared";
                  setIsShared(shared);
                  if (shared && shares.length === 0) {
                    setShares([{ name: "", amount: 0, isCurrentUser: true }]);
                  }
                }}>
                  <TabsList className="w-full">
                    <TabsTrigger value="personal" className="flex-1">Personal</TabsTrigger>
                    <TabsTrigger value="shared" className="flex-1">Shared</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {isShared && (
                <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Split Mode</label>
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant={splitMode === "equal" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setSplitMode("equal")}>Equal</Button>
                      <Button type="button" size="sm" variant={splitMode === "custom" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setSplitMode("custom")}>Custom</Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">People sharing this subscription</p>
                  {shares.map((share, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder="Name"
                        value={share.name}
                        onChange={(e) => {
                          const next = [...shares];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setShares(next);
                        }}
                        className="flex-1 h-8 text-sm"
                        disabled={share.isCurrentUser}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={splitMode === "equal" ? getEqualAmount(idx) : share.amount || ""}
                        onChange={(e) => {
                          if (splitMode === "custom") {
                            const next = [...shares];
                            next[idx] = { ...next[idx], amount: parseFloat(e.target.value) || 0 };
                            setShares(next);
                          }
                        }}
                        className="w-24 h-8 text-sm font-mono"
                        disabled={splitMode === "equal"}
                        readOnly={splitMode === "equal"}
                        placeholder="Amount"
                      />
                      {!share.isCurrentUser && (
                        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => setShares(shares.filter((_, i) => i !== idx))}>×</Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => setShares([...shares, { name: "", amount: 0, isCurrentUser: false }])}>+ Add person</Button>
                  {splitMode === "custom" && shares.length > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                      <span>Total: {formatAmount(priceNum, watchCurrency)}</span>
                      <span>Allocated: {formatAmount(shares.reduce((s, sh) => s + (sh.amount || 0), 0), watchCurrency)}</span>
                      <span className={shares.reduce((s, sh) => s + (sh.amount || 0), 0) !== priceNum ? "text-destructive font-medium" : "text-green-600"}>
                        Remaining: {formatAmount(Math.round((priceNum - shares.reduce((s, sh) => s + (sh.amount || 0), 0)) * 100) / 100, watchCurrency)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {priceNum > 0 && activeType === "recurring" && (
                <div className="bg-muted p-3 rounded-lg flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly equivalent:</span>
                  <span className="font-mono font-medium">{formatAmount(monthlyEq, watchCurrency)}</span>
                </div>
              )}

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === "none" ? null : Number(val))} 
                      value={field.value ? String(field.value) : "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {categories?.map(cat => (
                          <SelectItem key={cat.id} value={String(cat.id)}>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="simple-icons slug or local:asset-name" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <FormControl>
                      <Input placeholder="Visa ending in 4242" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any extra details..." className="resize-none h-20" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Turn off to stop tracking renewals (won't archive).
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter className="mt-8">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={createMut.isPending || updateMut.isPending}>
                {isEditing ? "Save Changes" : "Create Subscription"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
    
    <CatalogPicker open={catalogOpen} onOpenChange={setCatalogOpen} onSelect={handleCatalogSelect} />
    </>
  );
}
