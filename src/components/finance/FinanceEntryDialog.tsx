import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { signedAmount } from "@/lib/finance";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Partnership",
  "Event",
  "Merch",
  "Equipment",
  "Food",
  "Travel",
  "Software",
  "Grant",
  "Membership",
  "Other",
] as const;

/**
 * Income and expenses only. Adjustments rewrite the balance and go through
 * ReconcileDialog instead, so an ordinary entry can never become one by
 * picking the wrong option from a dropdown.
 */
export function FinanceEntryDialog({
  open,
  onOpenChange,
  entry,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entry?: any | null;
  currentUserId?: string;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (entry) {
      setForm({ ...entry, amount: String(Math.abs(Number(entry.amount || 0))) });
    } else {
      setForm({
        kind: "Expense",
        amount: "",
        entry_date: new Date().toLocaleDateString("sv-SE"),
        description: "",
        category: "Other",
        notes: "",
      });
    }
  }, [entry, open]);

  const isAdjustment = form.kind === "Adjustment";

  const save = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        entry_date: values.entry_date || new Date().toLocaleDateString("sv-SE"),
        description: values.description.trim(),
        amount: signedAmount(values.kind, Number(values.amount)),
        kind: values.kind,
        category: values.category,
        notes: values.notes?.trim() || null,
        ...(entry?.id ? {} : { created_by: currentUserId ?? null }),
      };
      if (entry?.id) {
        const { error } = await supabase.from("finance_entries").update(payload).eq("id", entry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("finance_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financeEntries"] });
      toast.success(entry ? "Entry updated" : "Entry added");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("finance_entries").delete().eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financeEntries"] });
      toast.success("Entry deleted");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit entry" : "Add income or cost"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.description?.trim()) return toast.error("Give the entry a description");
            const amount = Number(form.amount);
            if (!Number.isFinite(amount) || amount === 0)
              return toast.error("Enter an amount greater than zero");
            save.mutate(form);
          }}
        >
          {isAdjustment ? (
            <p className="border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              This is a balance adjustment. Only the amount, date and note can be edited here — its
              kind is fixed.
            </p>
          ) : (
            <Field label="Type">
              <div className="grid grid-cols-2 gap-2">
                {(["Expense", "Income"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setForm({ ...form, kind: k })}
                    className={cn(
                      "border px-3 py-2 text-sm transition-colors",
                      form.kind === k
                        ? k === "Income"
                          ? "border-[var(--status-success)] bg-[var(--status-success)]/10 text-[var(--status-success)]"
                          : "border-brand bg-brand/10 text-brand"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {k === "Income" ? "Income" : "Cost"}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (SEK)">
              <Input
                inputMode="decimal"
                placeholder="2500"
                value={form.amount ?? ""}
                onChange={(e) =>
                  setForm({ ...form, amount: e.target.value.replace(/[^\d.,]/g, "") })
                }
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={form.entry_date || ""}
                onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Description">
            <Input
              placeholder="Merch print run"
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          {!isAdjustment && (
            <Field label="Category">
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Notes (optional)">
            <Textarea
              rows={2}
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>

          <DialogFooter>
            {entry?.id && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-destructive hover:text-destructive"
                disabled={remove.isPending}
                onClick={() => confirm("Delete this entry?") && remove.mutate()}
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : entry ? "Save" : "Add entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="microlabel text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
