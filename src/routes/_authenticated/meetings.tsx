import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { companiesQuery, profilesQuery, meetingsQuery } from "@/lib/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusTag } from "@/components/shared/StatusTag";
import { MemberChip } from "@/components/shared/MemberChip";
import { Button } from "@/components/ui/button";
import { companyStatusColor, type CompanyStatus } from "@/components/outreach/statusStyles";
import { formatDate } from "@/lib/format";
import { MeetingDialog } from "@/components/meetings/MeetingDialog";
import { Plus } from "lucide-react";

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
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
