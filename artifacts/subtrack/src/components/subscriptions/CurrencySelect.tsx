import React, { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { currencies, COMMON_CURRENCY_CODES } from "@/data/currencies";

interface Props {
  value: string;
  onValueChange: (code: string) => void;
  className?: string;
}

const CurrencySelect = React.forwardRef<HTMLButtonElement, Props>(({ value, onValueChange, className }, ref) => {
  const [open, setOpen] = useState(false);

  const selectedCurrency = currencies.find((c) => c.code === value);
  const commonCurrencies = currencies.filter(c => COMMON_CURRENCY_CODES.includes(c.code));
  const otherCurrencies = currencies.filter(c => !COMMON_CURRENCY_CODES.includes(c.code));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedCurrency ? (
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">{selectedCurrency.flag}</span>
              <span className="font-medium">{selectedCurrency.code}</span>
              <span className="text-muted-foreground">{selectedCurrency.symbol}</span>
            </div>
          ) : (
            "Select currency..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup heading="Common">
              {commonCurrencies.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={`${currency.code} ${currency.name} ${currency.symbol}`}
                  onSelect={() => {
                    onValueChange(currency.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === currency.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="mr-2 text-base leading-none">{currency.flag}</span>
                  <span className="font-medium mr-2">{currency.code}</span>
                  <span className="text-muted-foreground mr-2">{currency.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate">{currency.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="All Currencies">
              {otherCurrencies.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={`${currency.code} ${currency.name} ${currency.symbol}`}
                  onSelect={() => {
                    onValueChange(currency.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === currency.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="mr-2 text-base leading-none">{currency.flag}</span>
                  <span className="font-medium mr-2">{currency.code}</span>
                  <span className="text-muted-foreground mr-2">{currency.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate">{currency.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

CurrencySelect.displayName = "CurrencySelect";

export default CurrencySelect;