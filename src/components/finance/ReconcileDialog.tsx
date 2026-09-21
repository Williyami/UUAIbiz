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
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatSEK } from "@/lib/format";
import { AlertTriangle } from "lucide-react";

const PHRASE = "RECONCILE";

/**
 * Correcting the balance never overwrites it — it books a signed Adjustment
 * entry for the difference, so the ledger still adds up and the correction is
 * attributable afterwards.
 *
 * Deliberately awkward: admin-only (Postgres enforces it too), needs a stated
 * reason, and needs the confirmation phrase typed out. Nobody lands here by
 * mis-clicking.
 */
export function ReconcileDialog({
  open,
  onOpenChange,
  computedBalance,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  computedBalance: number;
  currentUserId?: string;
}) {
  const qc = useQueryClient();
  const [actual, setActual] = useState("");
  const [reason, setReason] = useState("");
  const [phrase, setPhrase] = useState("");

  useEffect(() => {
    setActual("");
    setReason("");
    setPhrase("");
  }, [open]);

  const parsed = Number(actual.replace(",", "."));
  const hasAmount = actual.trim() !== "" && Number.isFinite(parsed);
  const delta = hasAmount ? Number((parsed - computedBalance).toFixed(2)) : 0;

  const ready =
    hasAmount && delta !== 0 && reason.trim().length >= 3 && phrase.trim().toUpperCase() === PHRASE;

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("finance_entries").insert({
        entry_date: new Date().toLocaleDateString("sv-SE"),
        description: `Balance correction — ${reason.trim()}`,
        amount: delta,
        kind: "Adjustment",
        category: "Other",
        notes: `Ledger said ${formatSEK(computedBalance)}, corrected to ${formatSEK(parsed)}.`,
        created_by: currentUserId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financeEntries"] });
      toast.success(`Balance corrected to ${formatSEK(parsed)}`);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Correct the balance</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-2.5 border border-brand/30 bg-brand/5 px-3 py-2.5">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-brand" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            This books a correction entry for the difference — it does not erase anything. Use it
            only when the ledger genuinely disagrees with the bank.
          </p>
        </div>

        <form
          className="space-y-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!ready) return;
            save.mutate();
          }}
        >
          <div className="flex items-baseline justify-between border-b pb-2">
            <span className="microlabel text-muted-foreground">Ledger says</span>
            <span className="tnum font-mono text-sm">{formatSEK(computedBalance)}</span>
          </div>

          <Field label="Actual balance (SEK)">
            <Input
              inputMode="decimal"
              placeholder="12500"
              value={actual}
              onChange={(e) => setActual(e.target.value.replace(/[^\d.,-]/g, ""))}
            />
          </Field>

          {hasAmount && (
            <div className="flex items-baseline justify-between bg-muted/40 px-3 py-2">
              <span className="microlabel text-muted-foreground">Correction to book</span>
              <span
                className={
                  delta === 0
                    ? "tnum font-mono text-sm text-muted-foreground"
                    : delta > 0
                      ? "tnum font-mono text-sm text-[var(--status-success)]"
                      : "tnum font-mono text-sm text-brand"
                }
              >
                {delta > 0 ? "+" : ""}
                {formatSEK(delta)}
              </span>
            </div>
          )}

          {hasAmount && delta === 0 && (
            <p className="text-xs text-muted-foreground">
              That already matches the ledger — nothing to correct.
            </p>
          )}

          <Field label="Why? (recorded on the entry)">
            <Input
              placeholder="Bank statement reconciliation, September"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>

          <Field label={`Type ${PHRASE} to confirm`}>
            <Input
              autoComplete="off"
              placeholder={PHRASE}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!ready || save.isPending}>
              {save.isPending ? "Booking…" : "Book correction"}
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
