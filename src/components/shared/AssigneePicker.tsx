import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollList } from "@/components/shared/ScrollList";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Search } from "lucide-react";

/** Multi-select of team members, styled like the other form controls. */
export function AssigneePicker({
  value,
  onChange,
  profiles,
  disabled,
  placeholder = "Unassigned",
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  profiles: any[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = profiles.filter((p) => value.includes(p.id));
  const shown = profiles.filter((p) =>
    `${p.name ?? ""} ${p.email ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()),
  );

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
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
          <span className="flex min-w-0 items-center gap-2">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                <span className="flex items-center -space-x-1.5">
                  {selected.slice(0, 4).map((p) => (
                    <Avatar key={p.id} p={p} />
                  ))}
                </span>
                <span className="truncate text-xs">
                  {selected.length === 1
                    ? selected[0].name || selected[0].email
                    : `${selected.length} people`}
                </span>
              </>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        {profiles.length > 6 && (
          <div className="relative mb-1">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people…"
              className="h-7 w-full rounded-[3px] border border-input bg-transparent pl-7 pr-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        )}
        <ScrollList as="ul" className="max-h-[25rem]">
          {shown.length === 0 && (
            <li className="px-2 py-3 text-center text-xs text-muted-foreground">No matches.</li>
          )}
          {shown.map((p) => {
            const active = value.includes(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-[3px] px-2 py-1.5 text-left transition-colors hover:bg-accent"
                >
                  <Avatar p={p} />
                  <span className="min-w-0 flex-1 truncate text-xs">{p.name || p.email}</span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-(--brand-red)" />}
                </button>
              </li>
            );
          })}
        </ScrollList>
      </PopoverContent>
    </Popover>
  );
}

function Avatar({ p }: { p: any }) {
  return p.avatar_url ? (
    <img
      src={p.avatar_url}
      alt=""
      className="h-5 w-5 shrink-0 rounded-full object-cover ring-2 ring-card"
    />
  ) : (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground/85 font-mono text-[8px] font-semibold uppercase text-background ring-2 ring-card">
      {initials(p.name || p.email)}
    </span>
  );
}
