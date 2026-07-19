import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { catalog, CATALOG_CATEGORIES, type CatalogEntry, type CatalogCategory } from "@/data/catalog";
import SubscriptionLogo from "./SubscriptionLogo";

export function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 40%)`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (entry: CatalogEntry) => void;
}

export default function CatalogPicker({ open, onOpenChange, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CatalogCategory | "All">("All");

  React.useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedCategory("All");
    }
  }, [open]);

  const popularEntries = useMemo(() => catalog.filter(c => c.popular), []);
  
  const filteredEntries = useMemo(() => {
    if (!search && selectedCategory === "All") {
      return [];
    }
    
    return catalog.filter(entry => {
      const matchesSearch = entry.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "All" || entry.category === selectedCategory;
      
      if (search) return matchesSearch;
      return matchesCategory;
    });
  }, [search, selectedCategory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-xl">Choose a Service</DialogTitle>
        </DialogHeader>
        
        <div className="px-6 py-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search catalog..." 
              className="pl-10 h-12 text-base"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 pb-6">
          {!search ? (
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Popular</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {popularEntries.map(entry => (
                    <div 
                      key={entry.id} 
                      onClick={() => onSelect(entry)}
                      className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-accent transition-colors text-center border border-transparent hover:border-border"
                    >
                      <SubscriptionLogo icon={entry.icon} name={entry.name} size="sm" />
                      <span className="text-xs font-medium truncate w-full px-1">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex overflow-x-auto gap-2 pb-4 snap-x scrollbar-hide">
                  <button
                    onClick={() => setSelectedCategory("All")}
                    className={cn(
                      "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0 snap-start border",
                      selectedCategory === "All" ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-border hover:bg-accent"
                    )}
                  >
                    All
                  </button>
                  {CATALOG_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0 snap-start border",
                        selectedCategory === cat ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-border hover:bg-accent"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                
                {selectedCategory !== "All" && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                    {filteredEntries.map(entry => (
                      <div 
                        key={entry.id} 
                        onClick={() => onSelect(entry)}
                        className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-accent transition-colors text-center border border-transparent hover:border-border"
                      >
                        <SubscriptionLogo icon={entry.icon} name={entry.name} size="sm" />
                        <span className="text-xs font-medium truncate w-full px-1">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="pb-8">
              {filteredEntries.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {filteredEntries.map(entry => (
                    <div 
                      key={entry.id} 
                      onClick={() => onSelect(entry)}
                      className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-accent transition-colors text-center border border-transparent hover:border-border"
                    >
                      <SubscriptionLogo icon={entry.icon} name={entry.name} size="sm" />
                      <span className="text-xs font-medium truncate w-full px-1">{entry.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-muted-foreground">No services found for "{search}"</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}