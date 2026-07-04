import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { profilesQuery, eventsQuery } from "@/lib/queries";
import { statusStyles, STATUS_ORDER, CompanyStatus } from "./statusStyles";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { Mail, Phone, User, Calendar, FileSignature, Trash2, Pencil } from "lucide-react";

export function CompanyDetail({
  company,
  onClose,
  onEdit,
}: {
  company: any | null;
  onClose: () => void;
  onEdit: (c: any) => void;
}) {
  const qc = useQueryClient();
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const { data: events } = useSuspenseQuery(eventsQuery);
  const [notes, setNotes] = useState("");

  useEffect(() => { setNotes(company?.notes || ""); }, [company?.id]);

  const update = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("companies").update(patch).eq("id", company.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("companies").delete().eq("id", company.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company deleted");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!company) return null;
  const linkedEvents = events.filter((e) => e.company_id === company.id);

  return (
    <Sheet open={!!company} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="text-xl">{company.name}</SheetTitle>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusStyles[company.status as CompanyStatus]}`}>{company.status}</span>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <section className="space-y-2 text-sm">
            {company.contact_person && <InfoRow icon={User}>{company.contact_person}</InfoRow>}
            {company.contact_email && <InfoRow icon={Mail}><a className="hover:underline" href={`mailto:${company.contact_email}`}>{company.contact_email}</a></InfoRow>}
            {company.contact_phone && <InfoRow icon={Phone}>{company.contact_phone}</InfoRow>}
            {company.last_contact_date && <InfoRow icon={Calendar}>Last contact: {formatDate(company.last_contact_date)}</InfoRow>}
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</label>
              <Select value={company.status} onValueChange={(v) => update.mutate({ status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Assigned to</label>
              <Select value={company.assigned_to || "none"} onValueChange={(v) => update.mutate({ assigned_to: v === "none" ? null : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </section>

          <section>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes</label>
            <Textarea
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== company.notes && update.mutate({ notes })}
              placeholder="Freeform notes about this company…"
              className="mt-1"
            />
          </section>

          <section>
            <div className="text-xs font-semibold mb-2">Linked events ({linkedEvents.length})</div>
            <div className="rounded-lg border divide-y">
              {linkedEvents.length === 0 && <div className="p-3 text-xs text-muted-foreground">No events linked yet</div>}
              {linkedEvents.map((e) => (
                <div key={e.id} className="p-3 flex items-center justify-between text-sm">
                  <div className="truncate">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(e.date)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-wrap gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => onEdit(company)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button size="sm" onClick={() => toast.info("Contract generator ships in the next phase")}>
              <FileSignature className="h-3.5 w-3.5" /> Generate contract
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive ml-auto"
              onClick={() => confirm(`Delete ${company.name}?`) && del.mutate()}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon: Icon, children }: any) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span>{children}</span>
    </div>
  );
}