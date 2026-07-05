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
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { profilesQuery, companiesQuery } from "@/lib/queries";
import { toast } from "sonner";
import { EVENT_STATUS_ORDER, EVENT_TYPE_ORDER } from "./eventStyles";
import { Trash2 } from "lucide-react";

export function EventDialog({
  open,
  onOpenChange,
  event,
  canEdit = true,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  event?: any | null;
  canEdit?: boolean;
}) {
  const qc = useQueryClient();
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const { data: companies } = useSuspenseQuery(companiesQuery);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    setForm(
      event ?? {
        title: "",
        company_id: null,
        event_type: "Lunch lecture",
        date: null,
        duration: "",
        venue: "",
        status: "Planned",
        cost_to_us: 0,
        revenue_from_partner: 0,
        food_cost: 0,
        participant_count: null,
        luma_link: "",
        assigned_to: null,
        notes: "",
      },
    );
  }, [event, open]);

  const save = useMutation({
    mutationFn: async (values: any) => {
      const { company, ...rest } = values;
      const payload = {
        ...rest,
        date: values.date || null,
        company_id: values.company_id || null,
        assigned_to: values.assigned_to || null,
        participant_count:
          values.participant_count === "" || values.participant_count == null
            ? null
            : Number(values.participant_count),
        cost_to_us: Number(values.cost_to_us || 0),
        revenue_from_partner: Number(values.revenue_from_partner || 0),
        food_cost: Number(values.food_cost || 0),
        luma_link: values.luma_link?.trim() || null,
      };
      if (event?.id) {
        const { error } = await supabase.from("events").update(payload).eq("id", event.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success(event ? "Event updated" : "Event added");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").delete().eq("id", event.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event deleted");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-medium tracking-tight">
            {event ? "Edit event" : "New event"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.title?.trim()) return toast.error("Title is required");
            save.mutate(form);
          }}
        >
          <fieldset disabled={!canEdit} className="contents">
          <Field label="Title">
            <Input
              value={form.title || ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company">
              <Select
                value={form.company_id || "none"}
                onValueChange={(v) => setForm({ ...form, company_id: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {companies.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Type">
              <Select
                value={form.event_type}
                onValueChange={(v) => setForm({ ...form, event_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_ORDER.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={form.date || ""}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Duration">
              <Input
                placeholder="e.g. 2 hours"
                value={form.duration || ""}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              />
            </Field>
            <Field label="Venue">
              <Input
                value={form.venue || ""}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Revenue from partner (SEK)">
              <Input
                type="number"
                min="0"
                value={form.revenue_from_partner ?? 0}
                onChange={(e) => setForm({ ...form, revenue_from_partner: e.target.value })}
              />
            </Field>
            <Field label="Cost to us (SEK)">
              <Input
                type="number"
                min="0"
                value={form.cost_to_us ?? 0}
                onChange={(e) => setForm({ ...form, cost_to_us: e.target.value })}
              />
            </Field>
            <Field label="Food cost (SEK)">
              <Input
                type="number"
                min="0"
                value={form.food_cost ?? 0}
                onChange={(e) => setForm({ ...form, food_cost: e.target.value })}
              />
            </Field>
            <Field label="Participants">
              <Input
                type="number"
                min="0"
                value={form.participant_count ?? ""}
                onChange={(e) => setForm({ ...form, participant_count: e.target.value })}
              />
            </Field>
            <Field label="Assigned to">
              <Select
                value={form.assigned_to || "none"}
                onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Luma link">
              <Input
                type="url"
                placeholder="https://lu.ma/…"
                value={form.luma_link || ""}
                onChange={(e) => setForm({ ...form, luma_link: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              rows={3}
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          </fieldset>
          <DialogFooter className="sm:justify-between">
            {canEdit && event?.id ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => confirm(`Delete "${event.title}"?`) && remove.mutate()}
                disabled={remove.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {canEdit ? "Cancel" : "Close"}
              </Button>
              {canEdit && (
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save"}
                </Button>
              )}
            </div>
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
