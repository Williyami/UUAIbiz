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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { AssigneePicker } from "@/components/shared/AssigneePicker";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { profilesQuery } from "@/lib/queries";
import { INDUSTRY_ORDER } from "./industryStyles";
import { toast } from "sonner";

const STATUSES = [
  "Contacted",
  "Discussing",
  "Negotiating",
  "Booked",
  "Declined",
  "On hold",
] as const;

type Company = any;

export function CompanyDialog({
  open,
  onOpenChange,
  company,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  company?: Company | null;
}) {
  const qc = useQueryClient();
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    setForm(
      company ?? {
        name: "",
        contact_person: "",
        contact_title: "",
        contact_email: "",
        contact_phone: "",
        status: "Contacted",
        industry: null,
        notes: "",
        assignees: [],
        established_partner: false,
        // adding a contact counts as contact — prefill today, still editable
        last_contact_date: new Date().toLocaleDateString("sv-SE"),
        meeting_booked: false,
        meeting_date: null,
      },
    );
  }, [company, open]);

  const save = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        ...values,
        last_contact_date: values.last_contact_date || null,
        assignees: values.assignees ?? [],
        industry: values.industry || null,
        meeting_booked: !!values.meeting_booked,
        meeting_date: values.meeting_booked ? values.meeting_date || null : null,
      };
      if (company?.id) {
        const { error } = await supabase.from("companies").update(payload).eq("id", company.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("companies").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success(company ? "Company updated" : "Company added");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{company ? "Edit company" : "Add company"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name?.trim()) return toast.error("Name is required");
            save.mutate(form);
          }}
        >
          <Field label="Company name">
            <Input
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact person">
              <Input
                value={form.contact_person || ""}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
              />
            </Field>
            <Field label="Contact title">
              <Input
                placeholder="e.g. Head of Events"
                value={form.contact_title || ""}
                onChange={(e) => setForm({ ...form, contact_title: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.contact_email || ""}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.contact_phone || ""}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
            </Field>
            <Field label="Industry">
              <Select
                value={form.industry || "none"}
                onValueChange={(v) => setForm({ ...form, industry: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {INDUSTRY_ORDER.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Assigned to">
              <AssigneePicker
                value={form.assignees ?? []}
                onChange={(ids) => setForm({ ...form, assignees: ids })}
                profiles={profiles}
              />
            </Field>
            <Field label="Last contact date">
              <Input
                type="date"
                value={form.last_contact_date || ""}
                onChange={(e) => setForm({ ...form, last_contact_date: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex items-center gap-6 border-y py-3">
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={!!form.meeting_booked}
                onCheckedChange={(v) => setForm({ ...form, meeting_booked: !!v })}
              />
              <span className="microlabel text-muted-foreground">Meeting booked?</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={!!form.established_partner}
                onCheckedChange={(v) => setForm({ ...form, established_partner: !!v })}
              />
              <span className="microlabel text-muted-foreground">Established partner</span>
            </label>
            {form.meeting_booked && (
              <div className="flex flex-1 items-center gap-2">
                <Label className="microlabel shrink-0 text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  className="h-8"
                  value={form.meeting_date || ""}
                  onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
                />
              </div>
            )}
          </div>
          <Field label="Notes">
            <Textarea
              rows={4}
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
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
