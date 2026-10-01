import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollList } from "@/components/shared/ScrollList";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Search, X } from "lucide-react";

/**
 * Multi-select of partner companies for an event.
 *
 * An event can run with several partners at once — the National AI Startup
 * Competition had four — so this mirrors AssigneePicker rather than the
 * single-value SearchableSelect it replaced.
 */
export function CompaniesPicker({
  value,
  onChange,
  companies,
  disabled,
  placeholder = "No partner",
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  companies: any[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = value.map((id) => companies.find((c) => c.id === id)).filter(Boolean);
  const shown = companies.filter((c) =>
    `${c.name ?? ""} ${c.contact_person ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()),
  );

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <span className="min-w-0 truncate">
              {selected.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : selected.length === 1 ? (
                <span className="text-xs">{selected[0].name}</span>
              ) : (
                <span className="text-xs">{selected.length} partners</span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-1">
          <div className="relative mb-1">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search companies…"
              className="h-7 w-full rounded-[3px] border border-input bg-transparent pl-7 pr-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <ScrollList as="ul" className="max-h-[22rem]">
            {shown.length === 0 && (
              <li className="px-2 py-3 text-center text-xs text-muted-foreground">No matches.</li>
            )}
            {shown.map((c) => {
              const active = value.includes(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-[3px] px-2 py-1.5 text-left transition-colors hover:bg-accent"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs">{c.name}</span>
                      {c.status && (
                        <span className="microlabel block text-[9px] text-muted-foreground">
                          {c.status}
                        </span>
                      )}
                    </span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0 text-(--brand-red)" />}
                  </button>
                </li>
              );
            })}
          </ScrollList>
        </PopoverContent>
      </Popover>

      {/* Chips, so several partners stay visible without opening the popover. */}
      {selected.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((c: any) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 border bg-muted/50 py-0.5 pl-1.5 pr-1 text-[10px]"
            >
              {c.name}
              {!disabled && (
                <button
                  type="button"
                  title={`Remove ${c.name}`}
                  onClick={() => toggle(c.id)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
