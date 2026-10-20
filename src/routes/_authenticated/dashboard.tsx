import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  companiesQuery,
  contactsQuery,
  eventsQuery,
  meetingsQuery,
  tasksQuery,
  profilesQuery,
  currentUserQuery,
} from "@/lib/queries";
import { formatDate, parseLocalDate } from "@/lib/format";
import { daysSinceContact, isStale } from "@/lib/stale";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusTag } from "@/components/shared/StatusTag";
import { PipelineWave } from "@/components/dashboard/PipelineWave";
import { isEventActive } from "@/components/events/eventStyles";
import { companyStatusColor, type CompanyStatus } from "@/components/outreach/statusStyles";
import { priorityColor, type TaskPriority } from "@/components/tasks/taskStyles";
import { CompanyDialog } from "@/components/outreach/CompanyDialog";
import { EventDialog } from "@/components/events/EventDialog";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { MeetingDialog } from "@/components/meetings/MeetingDialog";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Building2, CalendarCheck, CalendarDays, ListChecks } from "lucide-react";
import { errorMessage } from "@/lib/chunk-error";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(companiesQuery);
    context.queryClient.ensureQueryData(contactsQuery);
    context.queryClient.ensureQueryData(eventsQuery);
    context.queryClient.ensureQueryData(meetingsQuery);
    context.queryClient.ensureQueryData(tasksQuery);
    context.queryClient.ensureQueryData(profilesQuery);
  },
  component: Home,
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">Error: {errorMessage(error)}</div>
  ),
});

const DAY = 86_400_000;
// Conversations still being worked. Booked is won; Declined and On hold are parked.
const IN_PLAY = ["Contacted", "Discussing", "Negotiating"];

type Dialog = "company" | "event" | "task" | "meeting" | null;

type AgendaItem = {
  id: string;
  kind: "Event" | "Meeting" | "Task";
  date: Date;
  time: string | null;
  title: string;
  sub: string | null;
  to: "/events/$eventId" | "/outreach" | "/meetings" | "/tasks";
  eventId?: string;
};

const KIND_COLOR: Record<AgendaItem["kind"], string> = {
  Event: "var(--brand-red)",
  Meeting: "var(--status-info)",
  Task: "var(--status-neutral)",
};

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function dayLabel(d: Date, today: Date) {
  const diff = Math.round((d.getTime() - today.getTime()) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

function Home() {
  const { data: companies } = useSuspenseQuery(companiesQuery);
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: meetings } = useSuspenseQuery(meetingsQuery);
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<Dialog>(null);
  const canEdit = me?.role !== "viewer";

  const now = new Date();
  const today = new Date(now.toDateString());
  const in7 = new Date(today.getTime() + 7 * DAY);
  const in14 = new Date(today.getTime() + 14 * DAY);
  const in30 = new Date(today.getTime() + 30 * DAY);
  const firstName = me?.profile?.name?.split(" ")[0];

  // Outreach
  const inPlay = companies.filter((c) => IN_PLAY.includes(c.status));
  const negotiating = companies.filter((c) => c.status === "Negotiating").length;
  const stale = companies
    .filter(isStale)
    .map((c) => ({ ...c, quietFor: daysSinceContact(c) ?? 0 }))
    .sort((a, b) => b.quietFor - a.quietFor);
  const declined = companies.filter((c) => c.status === "Declined").length;
  const onHold = companies.filter((c) => c.status === "On hold").length;

  // Events still going ahead, from today on
  const upcomingEvents = events
    .filter((e) => e.date && isEventActive(e.status) && e.status !== "Completed")
    .filter((e) => parseLocalDate(e.date!) >= today)
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));
  const events30 = upcomingEvents.filter((e) => parseLocalDate(e.date!) <= in30);
  const eventsThisWeek = upcomingEvents.filter((e) => parseLocalDate(e.date!) < in7);

  // Meetings: booked from Outreach plus added by hand, as on the Meetings page
  const allMeetings = [
    ...companies
      .filter((c) => c.meeting_booked && c.meeting_date)
      .map((c) => ({
        id: `company-${c.id}`,
        title: c.name,
        sub: c.contact_person ?? null,
        date: c.meeting_date as string,
        time: null as string | null,
        to: "/outreach" as const,
      })),
    ...meetings
      .filter((m) => m.meeting_date)
      .map((m) => ({
        id: m.id,
        title: m.title,
        sub: m.internal ? "Internal" : (m.company?.name ?? null),
        date: m.meeting_date as string,
        time: (m.meeting_time?.slice(0, 5) ?? null) as string | null,
        to: "/meetings" as const,
      })),
  ]
    .filter((m) => parseLocalDate(m.date) >= today)
    .sort((a, b) => `${a.date}${a.time ?? "99"}`.localeCompare(`${b.date}${b.time ?? "99"}`));
  const meetingsThisWeek = allMeetings.filter((m) => parseLocalDate(m.date) < in7);

  // Your tasks
  const myTasks = tasks
    .filter((t) => me?.id && (t.assignees ?? []).includes(me.id) && t.status !== "Done")
    .sort((a, b) => ((a.due_date || "9999") < (b.due_date || "9999") ? -1 : 1));
  const myOverdue = myTasks.filter((t) => t.due_date && parseLocalDate(t.due_date) < today);

  // One line under the greeting: what needs someone this week
  const facts: string[] = [];
  if (myOverdue.length) facts.push(`${plural(myOverdue.length, "task")} of yours past due`);
  if (eventsThisWeek.length) facts.push(`${plural(eventsThisWeek.length, "event")} this week`);
  if (meetingsThisWeek.length)
    facts.push(`${plural(meetingsThisWeek.length, "meeting")} this week`);
  if (stale.length)
    facts.push(`${plural(stale.length, "company", "companies")} waiting on a follow-up`);
  const lede = facts.length
    ? `${facts.join(" · ")}.`
    : "Nothing is waiting on you right now. A good day to reach out to someone new.";

  // The next two weeks: events and meetings for everyone, tasks for you
  const agenda: AgendaItem[] = [
    ...upcomingEvents
      .filter((e) => parseLocalDate(e.date!) < in14)
      .map<AgendaItem>((e) => ({
        id: `e-${e.id}`,
        kind: "Event",
        date: parseLocalDate(e.date!),
        time: null,
        title: e.title,
        sub: e.company?.name ?? e.venue ?? null,
        to: "/events/$eventId",
        eventId: e.id,
      })),
    ...allMeetings
      .filter((m) => parseLocalDate(m.date) < in14)
      .map<AgendaItem>((m) => ({
        id: `m-${m.id}`,
        kind: "Meeting",
        date: parseLocalDate(m.date),
        time: m.time,
        title: m.title,
        sub: m.sub,
        to: m.to,
      })),
    ...myTasks
      .filter((t) => t.due_date && parseLocalDate(t.due_date) >= today)
      .filter((t) => parseLocalDate(t.due_date!) < in14)
      .map<AgendaItem>((t) => ({
        id: `t-${t.id}`,
        kind: "Task",
        date: parseLocalDate(t.due_date!),
        time: null,
        title: t.title,
        sub: `${t.priority} priority`,
        to: "/tasks",
      })),
  ].sort(
    (a, b) =>
      a.date.getTime() - b.date.getTime() ||
      (a.time ?? "99").localeCompare(b.time ?? "99") ||
      a.kind.localeCompare(b.kind),
  );
  const agendaShown = agenda.slice(0, 8);
  const agendaDays = agendaShown.reduce<{ label: string; items: AgendaItem[] }[]>((acc, item) => {
    const label = dayLabel(item.date, today);
    const last = acc[acc.length - 1];
    if (last?.label === label) last.items.push(item);
    else acc.push({ label, items: [item] });
    return acc;
  }, []);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 md:p-10">
      <PageHeader title={`Hej${firstName ? ` ${firstName}` : ""}.`} lede={lede} mark={false}>
        {canEdit && (
          <>
            <Button variant="outline" size="sm" onClick={() => setDialog("company")}>
              <Building2 className="h-3.5 w-3.5" /> Add company
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDialog("meeting")}>
              <CalendarCheck className="h-3.5 w-3.5" /> Add meeting
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDialog("event")}>
              <CalendarDays className="h-3.5 w-3.5" /> New event
            </Button>
            <Button size="sm" onClick={() => setDialog("task")}>
              <ListChecks className="h-3.5 w-3.5" /> New task
            </Button>
          </>
        )}
      </PageHeader>

      {/* A few key figures, each a door into its page */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          to="/outreach"
          label="Active outreach"
          value={inPlay.length}
          caption={negotiating ? `${negotiating} in negotiation` : "Companies in conversation"}
        />
        <StatCard
          to="/events"
          label="Events · next 30 days"
          value={events30.length}
          caption={
            upcomingEvents[0] ? `Next: ${formatDate(upcomingEvents[0].date)}` : "Nothing scheduled"
          }
        />
        <StatCard
          to="/meetings"
          label="Meetings this week"
          value={meetingsThisWeek.length}
          caption={
            meetingsThisWeek[0]
              ? `Next: ${dayLabel(parseLocalDate(meetingsThisWeek[0].date), today)}${meetingsThisWeek[0].time ? ` ${meetingsThisWeek[0].time}` : ""}`
              : "A quiet week"
          }
        />
        <StatCard
          to="/tasks"
          label="Your open tasks"
          value={myTasks.length}
          caption={myOverdue.length ? `${myOverdue.length} past due` : "Nothing past due"}
          danger={myOverdue.length > 0}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Coming up */}
        <Panel
          title="Coming up"
          hint="Next 14 days"
          to={agenda.length > agendaShown.length ? "/events" : undefined}
          className="lg:col-span-2"
        >
          {agendaDays.length === 0 ? (
            <Empty>No events, meetings or tasks of yours in the next two weeks.</Empty>
          ) : (
            <div className="divide-y">
              {agendaDays.map((day) => (
                <div key={day.label} className="px-4 py-3">
                  <div className="microlabel mb-1.5 text-[10px] text-muted-foreground">
                    {day.label}
                  </div>
                  <ul>
                    {day.items.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() =>
                            item.eventId
                              ? navigate({
                                  to: "/events/$eventId",
                                  params: { eventId: item.eventId },
                                })
                              : navigate({ to: item.to })
                          }
                          className="-mx-2 grid w-[calc(100%+1rem)] grid-cols-[3.5rem_1fr_auto] items-center gap-3 rounded-[3px] px-2 py-2 text-left transition-colors hover:bg-accent/50"
                        >
                          <span className="microlabel tnum text-[10px] text-muted-foreground">
                            {item.time ?? (item.kind === "Event" ? "All day" : "—")}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{item.title}</span>
                            {item.sub && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {item.sub}
                              </span>
                            )}
                          </span>
                          <StatusTag color={KIND_COLOR[item.kind]} className="text-[9.5px]">
                            {item.kind}
                          </StatusTag>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Needs a follow-up */}
        <Panel
          title="Needs a follow-up"
          hint={`${stale.length} quiet`}
          to={stale.length ? "/outreach" : undefined}
        >
          {stale.length === 0 ? (
            <Empty>Every active conversation has been touched in the last two weeks.</Empty>
          ) : (
            <ul className="divide-y">
              {stale.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link
                    to="/outreach"
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{c.name}</div>
                      <StatusTag
                        color={companyStatusColor[c.status as CompanyStatus]}
                        className="mt-1 text-[9px]"
                      >
                        {c.status}
                      </StatusTag>
                    </div>
                    <span className="microlabel tnum shrink-0 text-[10px] text-muted-foreground">
                      {c.quietFor} days quiet
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Pipeline */}
        <Panel
          title="Pipeline"
          hint={`${companies.length} companies · ${declined} declined · ${onHold} on hold`}
          className="lg:col-span-2"
        >
          <PipelineWave companies={companies} />
        </Panel>

        {/* Your tasks */}
        <Panel title="Your tasks" to="/tasks">
          {myTasks.length === 0 ? (
            <Empty>No open tasks assigned to you.</Empty>
          ) : (
            <ul className="divide-y">
              {myTasks.slice(0, 5).map((t) => {
                const overdue = !!t.due_date && parseLocalDate(t.due_date) < today;
                return (
                  <li key={t.id}>
                    <Link
                      to="/tasks"
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{t.title}</div>
                        <StatusTag
                          color={priorityColor[t.priority as TaskPriority]}
                          className="mt-1 text-[9px]"
                        >
                          {t.priority}
                        </StatusTag>
                      </div>
                      <span
                        className={`microlabel tnum shrink-0 text-[10px] ${overdue ? "font-semibold text-brand" : "text-muted-foreground"}`}
                      >
                        {t.due_date ? formatDate(t.due_date) : "No date"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <CompanyDialog
        open={dialog === "company"}
        onOpenChange={(o) => !o && setDialog(null)}
        company={null}
      />
      <MeetingDialog
        open={dialog === "meeting"}
        onOpenChange={(o) => !o && setDialog(null)}
        meeting={null}
      />
      <EventDialog
        open={dialog === "event"}
        onOpenChange={(o) => !o && setDialog(null)}
        event={null}
        canEdit={canEdit}
      />
      <TaskDialog
        open={dialog === "task"}
        onOpenChange={(o) => !o && setDialog(null)}
        task={null}
        canEdit={canEdit}
      />
    </div>
  );
}

function StatCard({
  to,
  label,
  value,
  caption,
  danger,
}: {
  to: string;
  label: string;
  value: number;
  caption: string;
  danger?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group border bg-card px-5 py-4 transition-colors hover:border-foreground/30"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="microlabel text-[10px] text-muted-foreground">{label}</span>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="tnum mt-2 font-display text-[1.8rem] font-medium leading-none tracking-tight">
        {value}
      </div>
      <div
        className={`mt-2.5 truncate text-xs ${danger ? "font-medium text-brand" : "text-muted-foreground"}`}
      >
        {caption}
      </div>
    </Link>
  );
}

function Panel({
  title,
  hint,
  to,
  className = "",
  children,
}: {
  title: string;
  hint?: string;
  to?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex flex-col border bg-card ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="font-display text-base font-medium tracking-tight">{title}</h2>
        <div className="flex items-center gap-3">
          {hint && (
            <span className="microlabel tnum text-[10px] text-muted-foreground">{hint}</span>
          )}
          {to && (
            <Link
              to={to}
              className="microlabel inline-flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-brand"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-muted-foreground">{children}</div>;
}
