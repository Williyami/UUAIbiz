import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollList } from "@/components/shared/ScrollList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Search, UserPlus, ArrowLeft } from "lucide-react";

/**
 * Which person at this company the outreach fields describe.
 *
 * Picking someone fills the contact fields below it rather than locking them:
 * the fields stay editable, and what you type there is written back to the
 * chosen contact on save. Adding a person here creates a real contacts row, so
 * next time they're in the list.
 */
export function ContactPicker({
  companyId,
  companyName,
  contacts,
  value,
  onSelect,
  disabled,
}: {
  companyId: string;
  companyName?: string;
  contacts: any[];
  value?: string | null;
  onSelect: (contact: any) => void;
  disabled?: boolean;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState({ name: "", role: "", email: "", phone: "" });

  const selected = contacts.find((c) => c.id === value);
  const shown = contacts.filter((c) =>
    `${c.name ?? ""} ${c.role ?? ""} ${c.email ?? ""}`
      .toLowerCase()
      .includes(q.trim().toLowerCase()),
  );

  function close() {
    setOpen(false);
    setAdding(false);
    setQ("");
    setDraft({ name: "", role: "", email: "", phone: "" });
  }

  const add = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          name: draft.name.trim(),
          role: draft.role.trim() || null,
          email: draft.email.trim() || null,
          phone: draft.phone.trim() || null,
          company_id: companyId,
          company_name: companyName ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (contact) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      onSelect(contact);
      toast.success(`${contact.name} added`);
      close();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) close();
      }}
    >
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
            {selected ? (
              <>
                <Badge name={selected.name} />
                <span className="truncate text-xs">{selected.name}</span>
                {selected.role && (
                  <span className="truncate text-xs text-muted-foreground">· {selected.role}</span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">
                {contacts.length ? "Pick who you contacted" : "No contacts yet"}
              </span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-1">
        {adding ? (
          <form
            className="space-y-1.5 p-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.name.trim()) return toast.error("Name is required");
              add.mutate();
            }}
          >
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="microlabel mb-1 flex items-center gap-1 text-[9.5px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" /> Back to list
            </button>
            <Input
              autoFocus
              className="h-8 text-xs"
              placeholder="Name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <Input
              className="h-8 text-xs"
              placeholder="Title (optional)"
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            />
            <Input
              className="h-8 text-xs"
              placeholder="Email (optional)"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
            <Input
              className="h-8 text-xs"
              placeholder="Phone (optional)"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
            <Button type="submit" size="sm" className="w-full" disabled={add.isPending}>
              {add.isPending ? "Adding…" : "Add and select"}
            </Button>
          </form>
        ) : (
          <>
            {contacts.length > 6 && (
              <div className="relative mb-1">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search contacts…"
                  className="h-7 w-full rounded-[3px] border border-input bg-transparent pl-7 pr-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            )}
            <ScrollList as="ul" className="max-h-[20rem]">
              {shown.length === 0 && (
                <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                  {contacts.length ? "No matches." : "Nobody recorded here yet."}
                </li>
              )}
              {shown.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(c);
                      close();
                    }}
                    className="flex w-full cursor-pointer items-start gap-2.5 rounded-[3px] px-2 py-1.5 text-left transition-colors hover:bg-accent"
                  >
                    <Badge name={c.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs">{c.name}</span>
                      {(c.role || c.email) && (
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {c.role || c.email}
                        </span>
                      )}
                    </span>
                    {c.id === value && (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--brand-red)" />
                    )}
                  </button>
                </li>
              ))}
            </ScrollList>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-[3px] border-t px-2 py-2 text-left text-xs transition-colors hover:bg-accent"
            >
              <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
              Add someone new
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Badge({ name }: { name?: string | null }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground/85 font-mono text-[8px] font-semibold uppercase text-background ring-2 ring-card">
      {initials(name)}
    </span>
  );
}
