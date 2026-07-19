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
import { Textarea } from "@/components/ui/textarea";

import CurrencySelect from "./CurrencySelect";
import CatalogPicker from "./CatalogPicker";
import SubscriptionLogo from "./SubscriptionLogo";
import { catalog, type CatalogEntry } from "@/data/catalog";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  icon: z.string().optional().or(z.literal("")),
  categoryId: z.coerce.number().optional().nullable(),
  price: z.coerce.number().min(0, "Price must be positive"),
  currency: z.string().min(1),
  billingCycle: z.nativeEnum(SubscriptionInputBillingCycle),
  renewalDate: z.string().min(1, "Renewal date is required"),
  paymentMethod: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
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
          renewalDate: subscription.renewalDate,
          paymentMethod: subscription.paymentMethod || "",
          notes: subscription.notes || "",
          isActive: subscription.isActive,
        });
        
        // Try to match with catalog
        const match = catalog.find(c => c.name.toLowerCase() === subscription.name.toLowerCase());
        if (match) setSelectedCatalogEntry(match);
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
      }
    } else {
      setSelectedCatalogEntry(null);
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
    if (isEditing) {
      updateMut.mutate({ id: subscription.id, data }, {
        onSuccess: () => {
          toast.success("Subscription updated");
          queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to update subscription")
      });
    } else {
      createMut.mutate({ data: { ...data, categoryId: data.categoryId ?? undefined } }, {
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

  const watchPrice = form.watch("price");
  const watchCycle = form.watch("billingCycle");
  
  const priceNum = Number(watchPrice) || 0;
  const monthlyEq = priceNum > 0 ?
    watchCycle === 'monthly' ? priceNum :
    watchCycle === 'yearly' ? priceNum / 12 :
    watchCycle === 'weekly' ? priceNum * 4.33 :
    watchCycle === 'quarterly' ? priceNum / 3 :
    watchCycle === 'semi_annual' ? priceNum / 6 : 0
  : 0;

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEditing ? "Edit Subscription" : "Add Subscription"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update details for this subscription." : "Track a new recurring expense."}
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="billingCycle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Cycle</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select cycle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="renewalDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Renewal *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {priceNum > 0 && (
                <div className="bg-muted p-3 rounded-lg flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly equivalent:</span>
                  <span className="font-mono font-medium">${monthlyEq.toFixed(2)}</span>
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
                      <Input placeholder="simple-icons slug, e.g. netflix" {...field} value={field.value || ""} />
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
