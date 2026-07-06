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
import { companiesQuery } from "@/lib/queries";
import { toast } from "sonner";

type Contact = any;

export function ContactDialog({
  open,
  onOpenChange,
  contact,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contact?: Contact | null;
}) {
  const qc = useQueryClient();
  const { data: companies } = useSuspenseQuery(companiesQuery);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    setForm(
      contact ?? {
        name: "",
        role: "",
        email: "",
        phone: "",
        company_id: null,
        company_name: "",
        notes: "",
      },
    );
  }, [contact, open]);

  const save = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        name: values.name.trim(),
        role: values.role?.trim() || null,
        email: values.email?.trim() || null,
        phone: values.phone?.trim() || null,
        company_id: values.company_id || null,
        company_name: values.company_id ? null : values.company_name?.trim() || null,
        notes: values.notes?.trim() || null,
      };
      if (contact?.id) {
        const { error } = await supabase.from("contacts").update(payload).eq("id", contact.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contacts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(contact ? "Contact updated" : "Contact added");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contacts").delete().eq("id", contact.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit contact" : "Add contact"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name?.trim()) return toast.error("Name is required");
            save.mutate(form);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Role / title">
              <Input
                value={form.role || ""}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="e.g. Talent lead"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone || ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Company (from Outreach)">
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
          {!form.company_id && (
            <Field label="Company name (if not in Outreach)">
              <Input
                value={form.company_name || ""}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              />
            </Field>
          )}
          <Field label="Notes">
            <Textarea
              rows={3}
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <DialogFooter>
            {contact?.id && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-destructive hover:text-destructive"
                disabled={remove.isPending}
                onClick={() => confirm("Delete this contact?") && remove.mutate()}
              >
                Delete
              </Button>
            )}
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
