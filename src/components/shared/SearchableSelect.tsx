import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";

export type SearchableOption = {
  value: string;
  label: string;
  /** Extra text matched by the filter but not shown as the label. */
  keywords?: string;
  hint?: string;
};

/**
 * Single-select with a filter box, for lists too long to scan by eye.
 *
 * Styled to match the plain `Select` trigger it replaces, so swapping one in
 * doesn't change the look of a form.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "None",
  searchPlaceholder = "Search…",
  emptyText = "No matches.",
  disabled,
  className,
}: {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
        <Command
          // Options carry their own searchable text in `value`, so cmdk's
          // default substring filter is enough — no custom scoring needed.
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList className="max-h-64">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={placeholder}
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <span className="flex-1 truncate text-muted-foreground">{placeholder}</span>
                {!value && <Check className="h-3.5 w-3.5 shrink-0 text-(--brand-red)" />}
              </CommandItem>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.keywords ?? ""} ${o.value}`}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.hint && (
                    <span className="microlabel ml-2 shrink-0 text-[8.5px] text-muted-foreground/70">
                      {o.hint}
                    </span>
                  )}
                  {o.value === value && (
                    <Check className="ml-2 h-3.5 w-3.5 shrink-0 text-(--brand-red)" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
