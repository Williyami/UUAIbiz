import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { profilesQuery, tasksQuery, currentUserQuery } from "@/lib/queries";
import { StatusTag } from "@/components/shared/StatusTag";
import { eventStatusColor, type EventStatus } from "./eventStyles";
import { EVENT_CHECKLIST, checklistDueDate } from "./eventChecklist";
import { formatSEK, formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Clock,
  Users,
  ExternalLink,
  ListChecks,
  Pencil,
  Trash2,
} from "lucide-react";

export function EventDetail({
  event,
  onClose,
  onEdit,
  canEdit = true,
}: {
  event: any | null;
  onClose: () => void;
  onEdit: (e: any) => void;
  canEdit?: boolean;
}) {
  const qc = useQueryClient();
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const generate = useMutation({
    mutationFn: async () => {
      if (!event.date) throw new Error("Set an event date first — the checklist is timed to it.");
      const existing = new Set(
        tasks.filter((t: any) => t.related_event_id === event.id).map((t: any) => t.title),
      );
      const missing = EVENT_CHECKLIST.filter((item) => !existing.has(item.title));
      if (missing.length === 0) return 0;
      const { error } = await supabase.from("tasks").insert(
        missing.map((item) => ({
          title: item.title,
          related_event_id: event.id,
          related_company_id: event.company_id ?? null,
          due_date: checklistDueDate(event.date, item.offset),
          status: "To do" as const,
          priority: item.offset === 0 ? ("High" as const) : ("Medium" as const),
          personal: false,
        })),
      );
      if (error) throw error;
      return missing.length;
    },
    onSuccess: (n) => {
      invalidate();
      toast.success(n === 0 ? "Checklist already added" : `${n} checklist tasks added to team tasks`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleDone = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: done ? "Done" : "To do" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const assign = useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string | null }) => {
      const { error } = await supabase.from("tasks").update({ assigned_to: userId }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").delete().eq("id", event.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event deleted");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!event) return null;

  const company = event.company;
  const eventTasks = tasks
    .filter((t: any) => t.related_event_id === event.id)
    .sort((a: any, b: any) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
  const doneCount = eventTasks.filter((t: any) => t.status === "Done").length;
  const owner = event.assigned_to ? profiles.find((p) => p.id === event.assigned_to) : null;
  const net =
    Number(event.revenue_from_partner || 0) -
    Number(event.cost_to_us || 0) -
    Number(event.food_cost || 0);
  const today = new Date(new Date().toDateString());

  return (
    <Sheet open={!!event} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b pb-4">
          <StatusTag color={eventStatusColor[event.status as EventStatus]}>{event.status}</StatusTag>
          <SheetTitle className="mt-1 font-display text-2xl font-medium tracking-tight">
            {event.title}
          </SheetTitle>
          <div className="microlabel tnum mt-1 text-[10px] text-muted-foreground">
            {event.event_type} · {event.date ? formatDate(event.date) : "No date"}
            {event.duration ? ` · ${event.duration}` : ""}
          </div>
        </SheetHeader>

        <div className="mt-5 space-y-6 px-4 pb-6 sm:px-0">
          {/* Partner & logistics */}
          <section className="space-y-2 text-sm">
            {company && (
              <InfoRow icon={User}>
                <span className="font-medium">{company.name}</span>
                {company.contact_person && (
                  <span className="text-muted-foreground"> — {company.contact_person}</span>
                )}
              </InfoRow>
            )}
            {company?.contact_email && (
              <InfoRow icon={Mail}>
                <a className="font-mono text-xs hover:underline" href={`mailto:${company.contact_email}`}>
                  {company.contact_email}
                </a>
              </InfoRow>
            )}
            {company?.contact_phone && (
              <InfoRow icon={Phone}>
                <span className="font-mono text-xs">{company.contact_phone}</span>
              </InfoRow>
            )}
            {event.venue && <InfoRow icon={MapPin}>{event.venue}</InfoRow>}
            {event.participant_count != null && (
              <InfoRow icon={Users}>
                <span className="tnum">{event.participant_count}</span> participants
              </InfoRow>
            )}
            {owner && (
              <InfoRow icon={Clock}>
                Owner: <span className="font-medium">{owner.name || owner.email}</span>
              </InfoRow>
            )}
            {event.luma_link && (
              <InfoRow icon={ExternalLink}>
                <a
                  href={event.luma_link}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-brand hover:underline"
                >
                  Luma event page
                </a>
              </InfoRow>
            )}
          </section>

          {/* Money strip */}
          <section className="grid grid-cols-4 divide-x border bg-background/60">
            <Money label="Revenue" value={Number(event.revenue_from_partner || 0)} />
            <Money label="Cost" value={Number(event.cost_to_us || 0)} />
            <Money label="Food" value={Number(event.food_cost || 0)} />
            <Money label="Net" value={net} signed />
          </section>

          {event.notes && (
            <section>
              <div className="microlabel mb-1.5 text-muted-foreground">About</div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                {event.notes}
              </p>
            </section>
          )}

          {/* Checklist */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <div className="microlabel text-muted-foreground">
                Checklist{eventTasks.length > 0 && (
                  <span className="tnum"> · {doneCount}/{eventTasks.length}</span>
                )}
              </div>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={generate.isPending || !event.date}
                  title={event.date ? undefined : "Set an event date first"}
                  onClick={() => generate.mutate()}
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  {eventTasks.length > 0 ? "Add missing items" : "Add checklist to team tasks"}
                </Button>
              )}
            </div>
            {eventTasks.length === 0 ? (
              <p className="border border-dashed px-3 py-4 text-xs text-muted-foreground">
                No tasks yet. This adds the standard procedure (book partner → marketing → Luma →
                follow-up) as team tasks, dated around{" "}
                {event.date ? formatDate(event.date) : "the event date"}. Anyone can then pick
                items up or you can assign them below.
              </p>
            ) : (
              <ul className="divide-y border">
                {eventTasks.map((t: any) => {
                  const done = t.status === "Done";
                  const overdue = !done && t.due_date && new Date(t.due_date) < today;
                  return (
                    <li key={t.id} className="flex items-center gap-2.5 px-3 py-2">
                      <Checkbox
                        checked={done}
                        disabled={!canEdit}
                        onCheckedChange={(v) => toggleDone.mutate({ id: t.id, done: !!v })}
                      />
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-xs ${done ? "text-muted-foreground line-through" : ""}`}>
                          {t.title}
                          {t.personal && <span className="microlabel ml-1.5 text-[8.5px] text-brand">Personal</span>}
                        </div>
                        <div className={`microlabel tnum mt-0.5 text-[9px] ${overdue ? "font-semibold text-brand" : "text-muted-foreground/70"}`}>
                          {t.due_date ? formatDate(t.due_date) : "No due date"}
                        </div>
                      </div>
                      <Select
                        value={t.assigned_to || "none"}
                        disabled={!canEdit}
                        onValueChange={(v) => assign.mutate({ id: t.id, userId: v === "none" ? null : v })}
                      >
                        <SelectTrigger className="h-7 w-[110px] shrink-0 text-[11px]">
                          <SelectValue placeholder="Assign" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {profiles.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {(p.name || p.email).split(" ")[0]}
                              {p.id === me?.id ? " (me)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {canEdit && (
            <section className="flex flex-wrap gap-2 border-t pt-4">
              <Button variant="outline" size="sm" onClick={() => onEdit(event)}>
                <Pencil className="h-3.5 w-3.5" /> Edit event
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-destructive hover:text-destructive"
                onClick={() => confirm(`Delete "${event.title}"?`) && del.mutate()}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon: Icon, children }: any) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

function Money({ label, value, signed }: { label: string; value: number; signed?: boolean }) {
  return (
    <div className="px-3 py-2.5">
      <div className="microlabel text-[9px] text-muted-foreground">{label}</div>
      <div className={`tnum mt-1 font-mono text-xs ${signed ? (value < 0 ? "text-brand" : "text-(--status-success)") : ""}`}>
        {formatSEK(value)}
      </div>
    </div>
  );
}
