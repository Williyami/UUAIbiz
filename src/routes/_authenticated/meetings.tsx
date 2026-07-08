import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { companiesQuery, profilesQuery, meetingsQuery } from "@/lib/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusTag } from "@/components/shared/StatusTag";
import { MemberChip } from "@/components/shared/MemberChip";
import { Button } from "@/components/ui/button";
import { companyStatusColor, type CompanyStatus } from "@/components/outreach/statusStyles";
import { formatDate, initials } from "@/lib/format";
import { MeetingDialog } from "@/components/meetings/MeetingDialog";
import { downloadICS, type IcsEvent } from "@/lib/ics";
import { Plus, CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/meetings")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(companiesQuery);
    context.queryClient.ensureQueryData(profilesQuery);
    context.queryClient.ensureQueryData(meetingsQuery);
  },
  component: MeetingsPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

function MeetingsPage() {
  const { data: companies } = useSuspenseQuery(companiesQuery);
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const { data: meetings } = useSuspenseQuery(meetingsQuery);
  const navigate = useNavigate();
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const today = new Date(new Date().toDateString());

  const fromCompanies = companies
    .filter((c: any) => c.meeting_booked)
    .map((c: any) => ({
      id: `company-${c.id}`,
      kind: "company" as const,
      title: c.name,
      subtitle: c.contact_person || "No contact person",
      meeting_date: c.meeting_date,
      status: c.status,
      assigned_to: c.assigned_to,
      source: c,
    }));

  const manual = meetings.map((m: any) => ({
    id: m.id,
    kind: "manual" as const,
    title: m.title,
    subtitle: m.company?.name || "No linked company",
    meeting_date: m.meeting_date,
    status: null,
    assigned_to: m.assigned_to,
    source: m,
  }));

  const all = [...fromCompanies, ...manual];
  const upcoming = all
    .filter((m) => !m.meeting_date || new Date(m.meeting_date) >= today)
    .sort((a, b) => (a.meeting_date || "9999").localeCompare(b.meeting_date || "9999"));
  const past = all
    .filter((m) => m.meeting_date && new Date(m.meeting_date) < today)
    .sort((a, b) => b.meeting_date!.localeCompare(a.meeting_date!));

  function open(row: any) {
    if (row.kind === "company") {
      navigate({ to: "/outreach" });
    } else {
      setEditing(row.source);
      setDialogOpen(true);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <PageHeader
        title="Meetings"
        lede="Company meetings booked from Outreach, plus any added manually."
      >
        <Button
          variant="outline"
          disabled={upcoming.every((m) => !m.meeting_date)}
          onClick={() =>
            downloadICS(
              "uuais-meetings.ics",
              upcoming.filter((m) => m.meeting_date).map(icsFromRow),
            )
          }
        >
          <CalendarPlus className="h-4 w-4" /> Export all
        </Button>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add meeting
        </Button>
      </PageHeader>

      {all.length === 0 ? (
        <div className="border border-dashed bg-card/50 px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No meetings yet. Tick "Meeting booked?" on a company in Outreach, or add one manually.
          </p>
        </div>
      ) : (
        <>
          <NextMeetingHero
            meeting={upcoming.find((m) => m.meeting_date) ?? null}
            profileMap={profileMap}
            onOpen={open}
          />
          <MonthCalendar rows={all} onOpen={open} />
          <MeetingList
            title="Upcoming"
            rows={upcoming}
            profileMap={profileMap}
            onOpen={open}
            emptyText="Nothing upcoming"
          />
          {past.length > 0 && (
            <MeetingList
              title="Past"
              rows={past}
              profileMap={profileMap}
              onOpen={open}
              muted
            />
          )}
        </>
      )}

      <MeetingDialog open={dialogOpen} onOpenChange={setDialogOpen} meeting={editing} />
    </div>
  );
}

function icsFromRow(row: any): IcsEvent {
  return {
    id: row.id,
    title: `Meeting: ${row.title}`,
    date: row.meeting_date,
    description:
      [row.subtitle === "No linked company" ? null : row.subtitle, row.source?.notes]
        .filter(Boolean)
        .join(" — ") || null,
  };
}

function NextMeetingHero({
  meeting,
  profileMap,
  onOpen,
}: {
  meeting: any | null;
  profileMap: Map<string, any>;
  onOpen: (row: any) => void;
}) {
  if (!meeting) {
    return (
      <section className="border bg-card px-5 py-6">
        <p className="microlabel text-[10px] text-muted-foreground">Next meeting</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing scheduled — add a date to a meeting to see it here.
        </p>
      </section>
    );
  }
  const a = meeting.assigned_to ? profileMap.get(meeting.assigned_to) : null;
  const d = new Date(meeting.meeting_date + "T00:00:00");
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const dayMonth = d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  return (
    <section
      onClick={() => onOpen(meeting)}
      className="cursor-pointer border bg-card transition-colors hover:border-foreground/30"
      style={{ borderTop: "2px solid var(--brand-red)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
        <div className="min-w-0">
          <p className="microlabel text-[10px] text-(--brand-red)">Next meeting</p>
          <h2 className="mt-1.5 truncate font-display text-2xl font-medium tracking-tight">
            {meeting.title}
          </h2>
          <p className="microlabel mt-1 text-[10px] text-muted-foreground">{meeting.subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-5">
          <div className="text-right">
            <div className="microlabel text-[10px] text-muted-foreground">{weekday}</div>
            <div className="tnum font-display text-xl font-medium tracking-tight">{dayMonth}</div>
          </div>
          {a && (
            <div className="hidden sm:block" title={a.name || a.email}>
              {a.avatar_url ? (
                <img src={a.avatar_url} alt="" className="size-9 rounded-full object-cover" />
              ) : (
                <div className="flex size-9 items-center justify-center rounded-full bg-foreground/85 font-mono text-[10px] font-semibold uppercase text-background">
                  {initials(a.name || a.email)}
                </div>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              downloadICS(`meeting-${meeting.meeting_date}.ics`, [icsFromRow(meeting)]);
            }}
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Add to calendar
          </Button>
        </div>
      </div>
    </section>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function MonthCalendar({ rows, onOpen }: { rows: any[]; onOpen: (row: any) => void }) {
  const todayIso = new Date().toLocaleDateString("sv-SE");
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const byDate = new Map<string, any[]>();
  for (const r of rows) {
    if (!r.meeting_date) continue;
    const list = byDate.get(r.meeting_date) ?? [];
    list.push(r);
    byDate.set(r.meeting_date, list);
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      new Date(year, month, i + 1).toLocaleDateString("sv-SE"),
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <section className="border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-display text-base font-medium tracking-tight">
          {cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-1">
          <button
            title="Previous month"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="cursor-pointer rounded-[3px] p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              const n = new Date();
              setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
            }}
            className="microlabel cursor-pointer rounded-[3px] px-2 py-1 text-[9.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Today
          </button>
          <button
            title="Next month"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="cursor-pointer rounded-[3px] p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((w) => (
          <div key={w} className="microlabel px-1 py-2 text-center text-[9px] text-muted-foreground">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((iso, i) => {
          if (!iso)
            return <div key={i} className="h-14 border-b border-r bg-muted/20 md:h-16" />;
          const dayMeetings = byDate.get(iso) ?? [];
          const isToday = iso === todayIso;
          return (
            <div
              key={i}
              onClick={dayMeetings.length ? () => onOpen(dayMeetings[0]) : undefined}
              title={dayMeetings.map((m) => m.title).join(", ") || undefined}
              className={`h-14 border-b border-r p-1.5 md:h-16 ${
                dayMeetings.length ? "cursor-pointer transition-colors hover:bg-accent/50" : ""
              } ${isToday ? "bg-accent/40" : ""}`}
            >
              <div
                className={`tnum text-right font-mono text-[10px] ${
                  isToday ? "font-bold text-(--brand-red)" : "text-muted-foreground"
                }`}
              >
                {Number(iso.slice(8))}
              </div>
              {dayMeetings.length > 0 && (
                <div className="mt-0.5 space-y-0.5">
                  <div className="flex justify-center gap-0.5">
                    {dayMeetings.slice(0, 3).map((m) => (
                      <span key={m.id} className="size-1.5 rounded-full bg-(--brand-red)" />
                    ))}
                  </div>
                  <div className="microlabel hidden truncate text-center text-[8px] text-muted-foreground md:block">
                    {dayMeetings[0].title}
                    {dayMeetings.length > 1 && ` +${dayMeetings.length - 1}`}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MeetingList({
  title,
  rows,
  profileMap,
  onOpen,
  muted,
  emptyText,
}: {
  title: string;
  rows: any[];
  profileMap: Map<string, any>;
  onOpen: (row: any) => void;
  muted?: boolean;
  emptyText?: string;
}) {
  return (
    <section className={`border bg-card ${muted ? "opacity-80" : ""}`}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-display text-base font-medium tracking-tight">{title}</h2>
        <span className="microlabel tnum text-[10px] text-muted-foreground">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <ul className="divide-y">
          {rows.map((row) => {
            const a = row.assigned_to ? profileMap.get(row.assigned_to) : null;
            return (
              <li
                key={row.id}
                onClick={() => onOpen(row)}
                className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{row.title}</div>
                  <div className="microlabel mt-0.5 text-[9.5px] text-muted-foreground/80">
                    {row.subtitle}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {row.status && (
                    <StatusTag
                      color={companyStatusColor[row.status as CompanyStatus]}
                      className="hidden text-[9.5px] sm:inline-flex"
                    >
                      {row.status}
                    </StatusTag>
                  )}
                  <MemberChip name={a ? a.name || a.email : null} avatarUrl={a?.avatar_url} profile={a} compact />
                  <span className="microlabel tnum text-muted-foreground">
                    {row.meeting_date ? formatDate(row.meeting_date) : "Date TBD"}
                  </span>
                  {row.meeting_date && (
                    <button
                      title="Add to calendar (.ics)"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadICS(`meeting-${row.meeting_date}.ics`, [icsFromRow(row)]);
                      }}
                      className="cursor-pointer rounded-[3px] border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <CalendarPlus className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
