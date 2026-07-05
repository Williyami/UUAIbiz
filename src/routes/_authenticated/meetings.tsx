import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { companiesQuery, profilesQuery } from "@/lib/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusTag } from "@/components/shared/StatusTag";
import { MemberChip } from "@/components/shared/MemberChip";
import { companyStatusColor, type CompanyStatus } from "@/components/outreach/statusStyles";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/meetings")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(companiesQuery);
    context.queryClient.ensureQueryData(profilesQuery);
  },
  component: MeetingsPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

function MeetingsPage() {
  const { data: companies } = useSuspenseQuery(companiesQuery);
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const navigate = useNavigate();
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const today = new Date(new Date().toDateString());
  const booked = companies.filter((c: any) => c.meeting_booked);
  const upcoming = booked
    .filter((c: any) => !c.meeting_date || new Date(c.meeting_date) >= today)
    .sort((a: any, b: any) => (a.meeting_date || "9999").localeCompare(b.meeting_date || "9999"));
  const past = booked
    .filter((c: any) => c.meeting_date && new Date(c.meeting_date) < today)
    .sort((a: any, b: any) => b.meeting_date!.localeCompare(a.meeting_date!));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <PageHeader
        title="Meetings"
        lede="Every company meeting on the books — set from a company's 'Meeting booked?' field in Outreach."
      />

      {booked.length === 0 ? (
        <div className="border border-dashed bg-card/50 px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No meetings booked yet. Tick "Meeting booked?" on a company in Outreach and it shows up
            here.
          </p>
        </div>
      ) : (
        <>
          <MeetingList
            title="Upcoming"
            rows={upcoming}
            profileMap={profileMap}
            onOpen={() => navigate({ to: "/outreach" })}
            emptyText="Nothing upcoming"
          />
          {past.length > 0 && (
            <MeetingList
              title="Past"
              rows={past}
              profileMap={profileMap}
              onOpen={() => navigate({ to: "/outreach" })}
              muted
            />
          )}
        </>
      )}
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
  onOpen: (c: any) => void;
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
          {rows.map((c) => {
            const a = c.assigned_to ? profileMap.get(c.assigned_to) : null;
            return (
              <li
                key={c.id}
                onClick={() => onOpen(c)}
                className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="microlabel mt-0.5 text-[9.5px] text-muted-foreground/80">
                    {c.contact_person || "No contact person"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <StatusTag
                    color={companyStatusColor[c.status as CompanyStatus]}
                    className="hidden text-[9.5px] sm:inline-flex"
                  >
                    {c.status}
                  </StatusTag>
                  <MemberChip name={a ? a.name || a.email : null} compact />
                  <span className="microlabel tnum text-muted-foreground">
                    {c.meeting_date ? formatDate(c.meeting_date) : "Date TBD"}
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
