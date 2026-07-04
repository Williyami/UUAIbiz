import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { profilesQuery } from "@/lib/queries";
import { toast } from "sonner";

const STATUSES = ["Contacted", "Negotiating", "Booked", "Completed", "Declined", "On hold"] as const;

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
        contact_email: "",
        contact_phone: "",
        status: "Contacted",
        source: "",
        notes: "",
        assigned_to: null,
        last_contact_date: null,
      },
    );
  }, [company, open]);

  const save = useMutation({
    mutationFn: async (values: any) => {
      const payload = { ...values, last_contact_date: values.last_contact_date || null, assigned_to: values.assigned_to || null };
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
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact person">
              <Input value={form.contact_person || ""} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.contact_email || ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.contact_phone || ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            </Field>
            <Field label="Source">
              <Input placeholder="cold LinkedIn, inbound…" value={form.source || ""} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Assigned to">
              <Select value={form.assigned_to || "none"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Last contact date">
              <Input type="date" value={form.last_contact_date || ""} onChange={(e) => setForm({ ...form, last_contact_date: e.target.value })} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea rows={4} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}