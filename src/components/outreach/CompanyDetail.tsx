import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { profilesQuery, eventsQuery } from "@/lib/queries";
import { AssigneePicker } from "@/components/shared/AssigneePicker";
import { STATUS_ORDER, CompanyStatus, companyStatusColor } from "./statusStyles";
import { StatusTag } from "@/components/shared/StatusTag";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { Mail, Phone, User, Calendar, CalendarCheck, FileSignature, Trash2, Pencil } from "lucide-react";

export function CompanyDetail({
  company,
  onClose,
  onEdit,
  canEdit = true,
}: {
  company: any | null;
  onClose: () => void;
  onEdit: (c: any) => void;
  canEdit?: boolean;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const { data: events } = useSuspenseQuery(eventsQuery);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setNotes(company?.notes || "");
  }, [company?.id]);

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
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <StatusTag color={companyStatusColor[company.status as CompanyStatus]}>
              {company.status}
            </StatusTag>
            {company.industry && (
              <span className="microlabel text-[9px] text-muted-foreground">
                {company.industry}
              </span>
            )}
            {company.established_partner && (
              <span className="microlabel flex items-center gap-1.5 text-[9px] text-emerald-500">
                <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_1px] shadow-emerald-500/70" />
                Established partner
              </span>
            )}
          </div>
          <SheetTitle className="mt-1 font-display text-2xl font-medium tracking-tight">
            {company.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-6 px-4 pb-6 sm:px-0">
          <section className="space-y-2 text-sm">
            {company.contact_person && (
              <InfoRow icon={User}>
                {company.contact_person}
                {company.contact_title && (
                  <span className="text-muted-foreground"> · {company.contact_title}</span>
                )}
              </InfoRow>
            )}
            {company.contact_email && (
              <InfoRow icon={Mail}>
                <a
                  className="font-mono text-xs hover:underline"
                  href={`mailto:${company.contact_email}`}
                >
                  {company.contact_email}
                </a>
              </InfoRow>
            )}
            {company.contact_phone && (
              <InfoRow icon={Phone}>
                <span className="font-mono text-xs">{company.contact_phone}</span>
              </InfoRow>
            )}
            {company.last_contact_date && (
              <InfoRow icon={Calendar}>
                Last contact: <span className="tnum">{formatDate(company.last_contact_date)}</span>
              </InfoRow>
            )}
            {company.meeting_booked && (
              <InfoRow icon={CalendarCheck}>
                Meeting booked
                {company.meeting_date && (
                  <>
                    : <span className="tnum">{formatDate(company.meeting_date)}</span>
                  </>
                )}
              </InfoRow>
            )}
          </section>

          <fieldset disabled={!canEdit} className="contents">
            <section className="grid grid-cols-2 gap-3">
              <div>
                <label className="microlabel text-muted-foreground">Status</label>
                <Select value={company.status} onValueChange={(v) => update.mutate({ status: v })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="microlabel text-muted-foreground">Assigned to</label>
                <div className="mt-1.5">
                  <AssigneePicker
                    value={company.assignees ?? []}
                    onChange={(ids) => update.mutate({ assignees: ids })}
                    profiles={profiles}
                  />
                </div>
              </div>
            </section>

            <section>
              <label className="microlabel text-muted-foreground">Notes</label>
              <Textarea
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => notes !== company.notes && update.mutate({ notes })}
                placeholder="Freeform notes about this company…"
                className="mt-1.5"
              />
            </section>
          </fieldset>

          <section>
            <div className="microlabel mb-2 text-muted-foreground">
              Linked events · {linkedEvents.length}
            </div>
            <div className="divide-y border">
              {linkedEvents.length === 0 && (
                <div className="p-3 text-xs text-muted-foreground">No events linked yet</div>
              )}
              {linkedEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3 text-sm">
                  <div className="truncate">{e.title}</div>
                  <div className="microlabel tnum text-[10px] text-muted-foreground">
                    {formatDate(e.date)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-wrap gap-2 border-t pt-4">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(company)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                onClose();
                navigate({
                  to: "/contracts",
                  search: {
                    company: company.name,
                    contact: company.contact_person || undefined,
                  },
                });
              }}
            >
              <FileSignature className="h-3.5 w-3.5" /> Generate contract
            </Button>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-destructive hover:text-destructive"
                onClick={() => confirm(`Delete ${company.name}?`) && del.mutate()}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
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
