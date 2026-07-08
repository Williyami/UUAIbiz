import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { eventsQuery, profilesQuery, companiesQuery, tasksQuery, currentUserQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusTag } from "@/components/shared/StatusTag";
import { EventDialog } from "@/components/events/EventDialog";
import { eventStatusColor, type EventStatus } from "@/components/events/eventStyles";
import { EVENT_CHECKLIST, checklistDueDate } from "@/components/events/eventChecklist";
import { formatSEK, formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  ArrowLeft,
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

export const Route = createFileRoute("/_authenticated/events_/$eventId")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(eventsQuery);
    context.queryClient.ensureQueryData(profilesQuery);
    context.queryClient.ensureQueryData(companiesQuery);
    context.queryClient.ensureQueryData(tasksQuery);
    context.queryClient.ensureQueryData(currentUserQuery);
  },
  component: EventPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

function EventPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);
  const canEdit = me?.role !== "viewer";
  const [editOpen, setEditOpen] = useState(false);

  const event: any = events.find((e) => e.id === eventId);

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
      const { error } = await supabase
        .from("tasks")
        .update({ assignees: userId ? [userId] : [] })
        .eq("id", id);
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
      navigate({ to: "/events" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!event) {
    return (
      <div className="mx-auto max-w-3xl p-6 md:p-10">
        <BackLink />
        <p className="mt-8 text-sm text-muted-foreground">This event doesn't exist anymore.</p>
      </div>
    );
  }

  const company = event.company;
  const eventTasks = tasks
    .filter((t: any) => t.related_event_id === event.id)
    .sort((a: any, b: any) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
  const doneCount = eventTasks.filter((t: any) => t.status === "Done").length;
  const owners = (event.assignees ?? []).map((id: string) => profiles.find((p) => p.id === id)).filter(Boolean);
  const net =
    Number(event.revenue_from_partner || 0) -
    Number(event.cost_to_us || 0) -
    Number(event.food_cost || 0);
  const today = new Date(new Date().toDateString());

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <BackLink />

      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div className="min-w-0">
          <StatusTag color={eventStatusColor[event.status as EventStatus]}>{event.status}</StatusTag>
          <h1 className="mt-2 font-display text-3xl font-medium leading-none tracking-tight">
            {event.title}
          </h1>
          <div className="microlabel tnum mt-2.5 text-[10px] text-muted-foreground">
            {event.event_type} · {event.date ? formatDate(event.date) : "No date"}
            {event.duration ? ` · ${event.duration}` : ""}
            {event.venue ? ` · ${event.venue}` : ""}
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => confirm(`Delete "${event.title}"?`) && del.mutate()}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Left: partner, money, notes */}
        <div className="space-y-6">
          <section className="border bg-card">
            <SectionHead>Partner & logistics</SectionHead>
            <div className="space-y-2.5 p-4 text-sm">
              {company ? (
                <>
                  <InfoRow icon={User}>
                    <span className="font-medium">{company.name}</span>
                    {company.contact_person && (
                      <span className="text-muted-foreground"> — {company.contact_person}</span>
                    )}
                  </InfoRow>
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
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No partner company linked.</p>
              )}
              {event.venue && <InfoRow icon={MapPin}>{event.venue}</InfoRow>}
              {event.participant_count != null && (
                <InfoRow icon={Users}>
                  <span className="tnum">{event.participant_count}</span> participants
                </InfoRow>
              )}
              {owners.length > 0 && (
                <InfoRow icon={Clock}>
                  Owner{owners.length > 1 ? "s" : ""}:{" "}
                  <span className="font-medium">
                    {owners.map((o: any) => o.name || o.email).join(", ")}
                  </span>
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
            </div>
          </section>

          <section className="grid grid-cols-4 divide-x border bg-card">
            <Money label="Revenue" value={Number(event.revenue_from_partner || 0)} />
            <Money label="Cost" value={Number(event.cost_to_us || 0)} />
            <Money label="Food" value={Number(event.food_cost || 0)} />
            <Money label="Net" value={net} signed />
          </section>

          {event.notes && (
            <section className="border bg-card">
              <SectionHead>About</SectionHead>
              <p className="whitespace-pre-wrap p-4 text-sm leading-relaxed text-foreground/85">
                {event.notes}
              </p>
            </section>
          )}
        </div>

        {/* Right: checklist */}
        <section className="h-fit border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-display text-base font-medium tracking-tight">
              Checklist
              {eventTasks.length > 0 && (
                <span className="microlabel tnum ml-2 text-[10px] text-muted-foreground">
                  {doneCount}/{eventTasks.length}
                </span>
              )}
            </h2>
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
            <p className="p-4 text-xs leading-relaxed text-muted-foreground">
              No tasks yet. This adds the standard procedure (book partner → marketing → Luma →
              follow-up) as team tasks, dated around{" "}
              {event.date ? formatDate(event.date) : "the event date"}. Assign items below, or
              anyone can open a task and mark it personal to claim it privately.
            </p>
          ) : (
            <ul className="divide-y">
              {eventTasks.map((t: any) => {
                const done = t.status === "Done";
                const overdue = !done && t.due_date && new Date(t.due_date) < today;
                return (
                  <li key={t.id} className="flex items-center gap-2.5 px-4 py-2.5">
                    <Checkbox
                      checked={done}
                      disabled={!canEdit}
                      onCheckedChange={(v) => toggleDone.mutate({ id: t.id, done: !!v })}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate text-xs ${done ? "text-muted-foreground line-through" : ""}`}
                      >
                        {t.title}
                        {t.personal && (
                          <span className="microlabel ml-1.5 text-[8.5px] text-brand">Personal</span>
                        )}
                      </div>
                      <div
                        className={`microlabel tnum mt-0.5 text-[9px] ${overdue ? "font-semibold text-brand" : "text-muted-foreground/70"}`}
                      >
                        {t.due_date ? formatDate(t.due_date) : "No due date"}
                      </div>
                    </div>
                    <Select
                      value={t.assignees?.[0] || "none"}
                      disabled={!canEdit}
                      onValueChange={(v) =>
                        assign.mutate({ id: t.id, userId: v === "none" ? null : v })
                      }
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
      </div>

      <EventDialog open={editOpen} onOpenChange={setEditOpen} event={event} canEdit={canEdit} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/events"
      className="microlabel inline-flex items-center gap-1.5 text-[10px] text-muted-foreground transition-colors hover:text-brand"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> All events
    </Link>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b px-4 py-3">
      <h2 className="font-display text-base font-medium tracking-tight">{children}</h2>
    </div>
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
      <div
        className={`tnum mt-1 font-mono text-xs ${signed ? (value < 0 ? "text-brand" : "text-(--status-success)") : ""}`}
      >
        {formatSEK(value)}
      </div>
    </div>
  );
}
