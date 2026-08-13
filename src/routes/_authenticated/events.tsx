import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { eventsQuery, profilesQuery, companiesQuery, tasksQuery, currentUserQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, ExternalLink, ArrowUpDown, CalendarPlus } from "lucide-react";
import { downloadICS, type IcsEvent } from "@/lib/ics";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusTag } from "@/components/shared/StatusTag";
import { MemberStack } from "@/components/shared/MemberStack";
import { EventDialog } from "@/components/events/EventDialog";
import {
  EVENT_STATUS_ORDER,
  EVENT_TYPE_ORDER,
  eventStatusColor,
  isEventActive,
  semesterBounds,
} from "@/components/events/eventStyles";
import { formatSEK, formatDate, parseLocalDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/events")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(eventsQuery);
    context.queryClient.ensureQueryData(profilesQuery);
    context.queryClient.ensureQueryData(companiesQuery);
    context.queryClient.ensureQueryData(tasksQuery);
    context.queryClient.ensureQueryData(currentUserQuery);
  },
  component: EventsPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

/** Display order for the grouped table — confirmed work sits above planning,
 *  paused work below it, and finished or dead events sink to the bottom. */
const EVENT_GROUP_ORDER = ["Confirmed", "Planned", "On hold", "Completed", "Cancelled"] as const;

/** Events store a date but no clock time, so these export as all-day entries. */
function icsFromEvent(e: any): IcsEvent {
  const details = [
    e.company?.name ? `Company: ${e.company.name}` : null,
    e.event_type ? `Type: ${e.event_type}` : null,
    `Status: ${e.status}`,
    e.venue ? `Venue: ${e.venue}` : null,
    e.duration ? `Duration: ${e.duration}` : null,
    e.luma_link ? `Luma: ${e.luma_link}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return { id: e.id, title: e.title, date: e.date, description: details };
}

function net(e: any) {
  return Number(e.revenue_from_partner || 0) - Number(e.cost_to_us || 0) - Number(e.food_cost || 0);
}

function EventsPage() {
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);
  const canEdit = me?.role !== "viewer";
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [sortAsc, setSortAsc] = useState(false);

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const sem = semesterBounds();

  const semesterEvents = events.filter(
    (e) =>
      isEventActive(e.status) &&
      e.date &&
      parseLocalDate(e.date) >= sem.start &&
      parseLocalDate(e.date) <= sem.end,
  );
  const revenue = semesterEvents.reduce((s, e) => s + Number(e.revenue_from_partner || 0), 0);
  const costs = semesterEvents.reduce(
    (s, e) => s + Number(e.cost_to_us || 0) + Number(e.food_cost || 0),
    0,
  );

  const rows = useMemo(() => {
    const filtered = events.filter((e) => {
      if (status !== "all" && e.status !== status) return false;
      if (type !== "all" && e.event_type !== type) return false;
      if (assignee !== "all") {
        const ids: string[] = e.assignees ?? [];
        if (assignee === "none" ? ids.length > 0 : !ids.includes(assignee)) return false;
      }
      if (
        q &&
        !`${e.title} ${(e as any).company?.name ?? ""} ${e.venue ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
        return false;
      return true;
    });
    return filtered.sort((a, b) => {
      const da = a.date || "9999-99-99";
      const db = b.date || "9999-99-99";
      return sortAsc ? da.localeCompare(db) : db.localeCompare(da);
    });
  }, [events, q, status, type, assignee, sortAsc]);

  // Export follows the filters, so "Confirmed only" exports just those. Undated
  // events can't be placed on a calendar, so they're left out.
  const datedRows = useMemo(() => rows.filter((e) => e.date), [rows]);

  // Grouped by status rather than one flat list: what's locked in comes first,
  // what still needs work next, and finished/dead events sink to the bottom.
  const groups = useMemo(
    () =>
      EVENT_GROUP_ORDER.map((s) => ({
        status: s,
        items: rows.filter((e) => e.status === s),
      })).filter((g) => g.items.length > 0),
    [rows],
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 md:p-10">
      <PageHeader
        title="Events"
        lede="Every event we've run or booked — dates, money and ownership."
      >
        <Button
          variant="outline"
          disabled={datedRows.length === 0}
          title={
            datedRows.length === 0
              ? "No dated events in the current filter"
              : `Export ${datedRows.length} event${datedRows.length === 1 ? "" : "s"} as .ics`
          }
          onClick={() => downloadICS("uuais-events.ics", datedRows.map(icsFromEvent))}
        >
          <CalendarPlus className="h-4 w-4" /> Export calendar
        </Button>
        {canEdit && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New event
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 divide-y border bg-card sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <Stat label={`Events · ${sem.label}`} value={String(semesterEvents.length)} />
        <Stat label="Revenue" value={formatSEK(revenue)} />
        <Stat label="Costs incl. food" value={formatSEK(costs)} />
        <Stat label="Net" value={formatSEK(revenue - costs)} danger={revenue - costs < 0} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search…"
            className="h-9 pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <FilterSelect value={status} onChange={setStatus}>
          <SelectItem value="all">All statuses</SelectItem>
          {EVENT_STATUS_ORDER.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect value={type} onChange={setType}>
          <SelectItem value="all">All types</SelectItem>
          {EVENT_TYPE_ORDER.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect value={assignee} onChange={setAssignee}>
          <SelectItem value="all">All assignees</SelectItem>
          <SelectItem value="none">Unassigned</SelectItem>
          {profiles.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name || p.email}
            </SelectItem>
          ))}
        </FilterSelect>
        <span className="microlabel tnum ml-auto text-[10px] text-muted-foreground">
          {rows.length} / {events.length}
        </span>
      </div>

      <div className="overflow-x-auto border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <Th>Event</Th>
              <Th>
                <button
                  className="microlabel inline-flex items-center gap-1 text-[10px] hover:text-foreground"
                  onClick={() => setSortAsc((v) => !v)}
                >
                  Date <ArrowUpDown className="h-3 w-3" />
                </button>
              </Th>
              <Th>Type</Th>
              <Th className="text-right">Revenue</Th>
              <Th className="text-right">Costs</Th>
              <Th className="text-right">Net</Th>
              <Th>Assigned</Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y">
            {groups.map((g) => (
              <Fragment key={g.status}>
                <tr className="border-t bg-muted/40">
                  <td colSpan={9} className="px-4 py-2">
                    <span className="inline-flex items-center gap-2">
                      <StatusTag color={eventStatusColor[g.status]}>{g.status}</StatusTag>
                      <span className="microlabel tnum text-[9.5px] text-muted-foreground">
                        {String(g.items.length).padStart(2, "0")}
                      </span>
                    </span>
                  </td>
                </tr>
                {g.items.map((e) => {
                  const n = net(e);
                  return (
                    <tr
                      key={e.id}
                      onClick={() =>
                        navigate({ to: "/events/$eventId", params: { eventId: e.id } })
                      }
                      className="cursor-pointer transition-colors hover:bg-accent/50"
                    >
                      <Td>
                        <div className="font-medium">{e.title}</div>
                        <div className="microlabel mt-0.5 text-[9.5px] text-muted-foreground/80">
                          {(e as any).company?.name || "No company"}
                          {e.venue ? ` · ${e.venue}` : ""}
                        </div>
                      </Td>
                      <Td>
                        <span className="microlabel tnum text-[10px] text-muted-foreground">
                          {formatDate(e.date)}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-muted-foreground">{e.event_type}</span>
                      </Td>
                      <Td className="text-right">
                        <Money value={Number(e.revenue_from_partner || 0)} />
                      </Td>
                      <Td className="text-right">
                        <Money value={Number(e.cost_to_us || 0) + Number(e.food_cost || 0)} />
                      </Td>
                      <Td className="text-right">
                        <Money value={n} signed />
                      </Td>
                      <Td>
                        <MemberStack ids={e.assignees} profileMap={profileMap} />
                      </Td>
                      <Td>
                        {e.luma_link && (
                          <a
                            href={e.luma_link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(ev) => ev.stopPropagation()}
                            className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-brand"
                            title="Open Luma event"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-10 text-center text-sm text-muted-foreground">
                  No events match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editing}
        canEdit={canEdit}
      />
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="px-5 py-4">
      <div className="microlabel text-[10px] text-muted-foreground">{label}</div>
      <div
        className={`tnum mt-1.5 font-display text-2xl font-medium leading-none tracking-tight ${danger ? "text-brand" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function Money({ value, signed }: { value: number; signed?: boolean }) {
  return (
    <span
      className={`font-mono text-xs tnum ${signed ? (value < 0 ? "text-brand" : value > 0 ? "text-(--status-success)" : "text-muted-foreground") : ""}`}
    >
      {formatSEK(value)}
    </span>
  );
}

function FilterSelect({ value, onChange, children }: any) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function Th({ children, className = "" }: any) {
  return (
    <th
      className={`microlabel px-4 py-2.5 text-left text-[10px] text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}
function Td({ children, className = "" }: any) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}
