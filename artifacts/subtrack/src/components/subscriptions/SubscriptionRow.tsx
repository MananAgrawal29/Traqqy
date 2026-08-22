import React from "react";
import { format } from "date-fns";
import { type Subscription } from "@workspace/api-client-react";
import SubscriptionLogo from "./SubscriptionLogo";
import { formatAmount } from "@/data/currencies";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Archive, ArchiveRestore } from "lucide-react";

interface SubscriptionRowProps {
  subscription: Subscription;
  onEdit: (sub: Subscription) => void;
  onArchive: (id: number) => void;
  onRestore: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function SubscriptionRow({
  subscription: sub,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: SubscriptionRowProps) {
  const daysText =
    sub.isArchived
      ? "Archived"
      : sub.daysUntilRenewal === 0
        ? "Today"
        : sub.daysUntilRenewal === 1
          ? "Tomorrow"
          : sub.daysUntilRenewal != null
            ? `In ${sub.daysUntilRenewal}d`
            : "—";

  const daysColor =
    sub.isArchived
      ? "text-muted-foreground"
      : (sub.daysUntilRenewal ?? 99) <= 3
        ? "text-destructive font-medium"
        : (sub.daysUntilRenewal ?? 99) <= 7
          ? "text-warning font-medium"
          : "text-muted-foreground";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group flex items-center gap-4 py-3.5 px-3 -mx-3 rounded-lg hover:bg-accent/5 transition-colors cursor-default",
        sub.isArchived && "opacity-50",
        !sub.isActive && !sub.isArchived && "opacity-70"
      )}
    >
      {/* Logo + Name */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <SubscriptionLogo icon={sub.icon} name={sub.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {sub.name}
            </p>
            {sub.categoryName && (
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                · {sub.categoryName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            <span className="capitalize">
              {sub.billingCycle.replace("_", " ")}
            </span>
            {sub.isArchived && (
              <span className="text-muted-foreground/60">· Archived</span>
            )}
            {!sub.isActive && !sub.isArchived && (
              <span className="text-muted-foreground/60">· Inactive</span>
            )}
            {sub.paymentMethod && (
              <>
                <span className="text-border">·</span>
                <span className="truncate max-w-[120px]">
                  {sub.paymentMethod}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Renewal */}
      <div className="hidden sm:block text-right w-24 shrink-0">
        <p className="text-xs text-muted-foreground">
          {format(new Date(sub.renewalDate), "MMM d")}
        </p>
        <p className={cn("text-xs", daysColor)}>{daysText}</p>
      </div>

      {/* Price */}
      <div className="text-right w-28 shrink-0">
        <p className="text-sm font-semibold font-mono tracking-tight">
          {formatAmount(sub.price, sub.currency)}
        </p>
        {sub.billingCycle !== "monthly" && sub.monthlyEquivalent ? (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            ≈ {formatAmount(sub.monthlyEquivalent, sub.currency)}/mo
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            /{sub.currency}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent/10">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(sub)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            {sub.isArchived ? (
              <DropdownMenuItem onClick={() => onRestore(sub.id)}>
                <ArchiveRestore className="mr-2 h-4 w-4" /> Restore
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onArchive(sub.id)}>
                <Archive className="mr-2 h-4 w-4" /> Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(sub.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
