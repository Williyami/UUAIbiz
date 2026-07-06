import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { StatusTag } from "@/components/shared/StatusTag";
import { companyStatusColor, type CompanyStatus } from "@/components/outreach/statusStyles";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

// Detail/edit widget for a contact that lives on an Outreach company row:
// edits write back to the company's contact fields.
export function CompanyContactDialog({
  open,
  onOpenChange,
  company,
  canEdit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  company: any | null;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    setForm({
      contact_person: company?.contact_person ?? "",
      contact_email: company?.contact_email ?? "",
      contact_phone: company?.contact_phone ?? "",
    });
  }, [company, open]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("companies")
        .update({
          contact_person: form.contact_person?.trim() || null,
          contact_email: form.contact_email?.trim() || null,
          contact_phone: form.contact_phone?.trim() || null,
        })
        .eq("id", company.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Contact updated");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{company.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border bg-muted/40 px-3 py-2.5">
          <StatusTag color={companyStatusColor[company.status as CompanyStatus]} className="text-[9.5px]">
            {company.status}
          </StatusTag>
          {company.industry && (
            <span className="microlabel text-[9.5px] text-muted-foreground">{company.industry}</span>
          )}
          <span className="microlabel tnum ml-auto text-[9.5px] text-muted-foreground">
            Last contact {company.last_contact_date ? formatDate(company.last_contact_date) : "—"}
          </span>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Contact person">
            <Input
              value={form.contact_person || ""}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Email">
              <Input
                type="email"
                value={form.contact_email || ""}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.contact_phone || ""}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
            </Field>
          </div>
          {company.notes && (
            <Field label="Outreach notes">
              <p className="whitespace-pre-wrap border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                {company.notes}
              </p>
            </Field>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="mr-auto"
              onClick={() => {
                onOpenChange(false);
                navigate({ to: "/outreach" });
              }}
            >
              Open in Outreach
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {canEdit ? "Cancel" : "Close"}
            </Button>
            {canEdit && (
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            )}
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
