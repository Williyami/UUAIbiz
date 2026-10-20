import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  profilesQuery,
  userRolesQuery,
  companiesQuery,
  eventsQuery,
  tasksQuery,
  currentUserQuery,
  accessRequestsQuery,
  userVisitsQuery,
  meetingsQuery,
} from "@/lib/queries";
import {
  createTeamMember,
  deleteTeamMember,
  setMemberRole,
  resetMemberPassword,
} from "@/lib/team.functions";
import { supabase } from "@/integrations/supabase/client";
import { ProfileWidget } from "@/components/shared/ProfileWidget";
import { OnlineAvatar } from "@/components/shared/OnlineAvatar";
import { useOnlineUsers } from "@/components/shared/presence-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/PageHeader";
import { initials, formatDate, parseLocalDate, timeAgo } from "@/lib/format";
import { StatusTag } from "@/components/shared/StatusTag";
import { isEventActive } from "@/components/events/eventStyles";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Copy,
  KeyRound,
  ShieldCheck,
  Eye,
  UserMinus,
  Check,
  X,
  Settings,
  LayoutGrid,
  List,
} from "lucide-react";
import { errorMessage } from "@/lib/chunk-error";

type AppRole = "admin" | "member" | "viewer";

function roleLabel(role: AppRole | undefined): string {
  return role === "admin" ? "Admin" : role === "viewer" ? "Viewer" : "Business team";
}

export const Route = createFileRoute("/_authenticated/team")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(profilesQuery);
    context.queryClient.ensureQueryData(userRolesQuery);
    context.queryClient.ensureQueryData(companiesQuery);
    context.queryClient.ensureQueryData(eventsQuery);
    context.queryClient.ensureQueryData(tasksQuery);
    context.queryClient.ensureQueryData(accessRequestsQuery);
    context.queryClient.ensureQueryData(meetingsQuery);
  },
  component: TeamPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">Error: {errorMessage(error)}</div>
  ),
});

function TeamPage() {
  const qc = useQueryClient();
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const { data: roles } = useSuspenseQuery(userRolesQuery);
  const { data: companies } = useSuspenseQuery(companiesQuery);
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);
  const { data: requests } = useSuspenseQuery(accessRequestsQuery);
  const { data: visits } = useSuspenseQuery(userVisitsQuery);
  const visitMap = new Map(visits.map((v: any) => [v.user_id, v]));

  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<"overview" | "all">("overview");
  const [viewing, setViewing] = useState<any>(null);
  const [accountReady, setAccountReady] = useState<{
    email: string;
    emailSent: boolean;
  } | null>(null);
  const [prefill, setPrefill] = useState<{ name: string; email: string; requestId: string } | null>(
    null,
  );

  const roleMap = new Map(roles.map((r) => [r.user_id, r.role as AppRole]));
  const online = useOnlineUsers();
  // Most recently active first: whoever is in the hub right now, then by last
  // visit, and anyone who has never visited at the end.
  const lastVisit = (id: string) => {
    const at = visitMap.get(id)?.last_visit_at;
    return at ? Date.parse(at) : 0;
  };
  const sortedProfiles = [...profiles].sort(
    (a, b) =>
      Number(online.has(b.id)) - Number(online.has(a.id)) ||
      lastVisit(b.id) - lastVisit(a.id) ||
      (a.name || a.email).localeCompare(b.name || b.email, "sv"),
  );
  const pendingRequests = requests.filter((r) => r.status === "pending");

  const reset = useMutation({
    mutationFn: (userId: string) => resetMemberPassword({ data: { userId } }),
    onSuccess: (res, userId) => {
      const p = profiles.find((x) => x.id === userId);
      setAccountReady({ email: res.email ?? p?.email ?? "", emailSent: res.emailSent });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) =>
      setMemberRole({ data: { userId, role } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userRoles"] });
      toast.success("Role updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => deleteTeamMember({ data: { userId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["userRoles"] });
      toast.success("Team member removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const denyRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("access_requests")
        .update({ status: "denied" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accessRequests"] });
      toast.success("Request denied");
    },
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 md:p-10">
      <PageHeader
        title="Team"
        lede={
          view === "overview"
            ? "What everyone is working on right now."
            : "Who has access to the hub, and what they own."
        }
      >
        <div className="inline-flex border bg-card p-0.5">
          <ViewToggle
            active={view === "overview"}
            onClick={() => setView("overview")}
            icon={LayoutGrid}
          >
            Overview
          </ViewToggle>
          <ViewToggle active={view === "all"} onClick={() => setView("all")} icon={List}>
            All users
          </ViewToggle>
        </div>
        {me?.isAdmin && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add member
          </Button>
        )}
      </PageHeader>

      {me?.isAdmin && pendingRequests.length > 0 && (
        <div className="border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <h2 className="font-display text-sm font-medium tracking-tight">Access requests</h2>
            <span className="microlabel tnum text-[10px] text-muted-foreground">
              {pendingRequests.length} pending
            </span>
          </div>
          <div className="divide-y">
            {pendingRequests.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">
                    {r.email}
                  </div>
                  {r.message && (
                    <div className="mt-1 text-xs text-muted-foreground/80">{r.message}</div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-muted-foreground"
                  onClick={() => {
                    setPrefill({ name: r.name, email: r.email, requestId: r.id });
                    setAddOpen(true);
                  }}
                >
                  <Check className="h-3.5 w-3.5" /> Approve
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-muted-foreground hover:text-destructive"
                  onClick={() => denyRequest.mutate(r.id)}
                >
                  <X className="h-3.5 w-3.5" /> Deny
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "overview" ? (
        <TeamOverview
          profiles={sortedProfiles}
          visitMap={me?.isAdmin ? visitMap : undefined}
          roleMap={roleMap}
          companies={companies}
          events={events}
          tasks={tasks}
          meId={me?.id}
          onView={setViewing}
        />
      ) : (
        <div className="divide-y border bg-card">
          {sortedProfiles.map((p) => {
            const role = roleMap.get(p.id);
            const owned = {
              companies: companies.filter((c) => (c.assignees ?? []).includes(p.id)).length,
              events: events.filter((e) => (e.assignees ?? []).includes(p.id)).length,
              tasks: tasks.filter((t) => (t.assignees ?? []).includes(p.id) && t.status !== "Done")
                .length,
            };
            return (
              <div key={p.id} className="flex items-center gap-4 px-4 py-4">
                <button
                  onClick={() => setViewing(p)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left"
                >
                  <OnlineAvatar profile={p} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{p.name || p.email}</span>
                      {p.id === me?.id && (
                        <span className="microlabel text-[9px] text-muted-foreground">You</span>
                      )}
                      <span
                        className={`microlabel text-[9px] ${role === "admin" ? "text-brand" : "text-muted-foreground"}`}
                      >
                        {roleLabel(role)}
                      </span>
                    </div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">
                      {p.email}
                    </div>
                  </div>
                </button>
                <div className="microlabel tnum hidden gap-4 text-[10px] text-muted-foreground sm:flex">
                  <span>{owned.companies} companies</span>
                  <span>{owned.events} events</span>
                  <span>{owned.tasks} open tasks</span>
                  {me?.isAdmin && (
                    <span
                      title={
                        visitMap.get(p.id)?.last_visit_at
                          ? `Last visit ${new Date(visitMap.get(p.id)!.last_visit_at).toLocaleString("sv-SE")}`
                          : "Never visited"
                      }
                      className={visitMap.get(p.id) ? "" : "text-muted-foreground/50"}
                    >
                      {visitMap.get(p.id)?.visit_count ?? 0} visits
                    </span>
                  )}
                </div>
                {me?.isAdmin && p.id === me.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to="/settings">
                          <Settings className="h-3.5 w-3.5" /> Edit profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/auth/change-password">
                          <KeyRound className="h-3.5 w-3.5" /> Change password
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {me?.isAdmin && p.id !== me.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {(["admin", "member", "viewer"] as const)
                        .filter((r) => r !== role)
                        .map((r) => (
                          <DropdownMenuItem
                            key={r}
                            onClick={() => changeRole.mutate({ userId: p.id, role: r })}
                          >
                            {r === "viewer" ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <ShieldCheck className="h-3.5 w-3.5" />
                            )}{" "}
                            Make {roleLabel(r).toLowerCase()}
                          </DropdownMenuItem>
                        ))}
                      <DropdownMenuItem onClick={() => reset.mutate(p.id)}>
                        <KeyRound className="h-3.5 w-3.5" /> Reset password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() =>
                          confirm(`Remove ${p.name || p.email} from the team?`) &&
                          remove.mutate(p.id)
                        }
                      >
                        <UserMinus className="h-3.5 w-3.5" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!me?.isAdmin && (
        <p className="microlabel text-[10px] text-muted-foreground/70">
          Only admins can add or manage team members.
        </p>
      )}

      <AddMemberDialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) setPrefill(null);
        }}
        prefill={prefill}
        onCreated={(email, emailSent) => {
          setAccountReady({ email, emailSent });
          if (prefill) {
            supabase
              .from("access_requests")
              .update({ status: "approved" })
              .eq("id", prefill.requestId)
              .then(() => qc.invalidateQueries({ queryKey: ["accessRequests"] }));
            setPrefill(null);
          }
        }}
      />
      <AccountReadyDialog info={accountReady} onClose={() => setAccountReady(null)} />
      <ProfileWidget profile={viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </div>
  );
}

function AddMemberDialog({
  open,
  onOpenChange,
  onCreated,
  prefill,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (email: string, emailSent: boolean) => void;
  prefill?: { name: string; email: string } | null;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("member");

  const openKey = open ? (prefill ? `${prefill.name}:${prefill.email}` : "new") : null;
  const [seenKey, setSeenKey] = useState<string | null>(null);
  if (openKey !== seenKey) {
    setSeenKey(openKey);
    if (openKey) {
      setName(prefill?.name ?? "");
      setEmail(prefill?.email ?? "");
      setRole("member");
    }
  }

  const create = useMutation({
    mutationFn: () => createTeamMember({ data: { name, email, role } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["userRoles"] });
      toast.success("Account created");
      onOpenChange(false);
      onCreated(email, res.emailSent);
      setName("");
      setEmail("");
      setRole("member");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-medium tracking-tight">
            Add team member
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !email.trim()) return toast.error("Name and email are required");
            create.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label className="microlabel text-muted-foreground">Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="microlabel text-muted-foreground">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="microlabel text-muted-foreground">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Business team</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AccountReadyDialog({
  info,
  onClose,
}: {
  info: { email: string; emailSent: boolean } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!info} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-medium tracking-tight">
            Ready to set a password
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {info?.emailSent ? (
            <>
              We emailed <span className="font-mono text-xs text-foreground">{info?.email}</span>{" "}
              with instructions.
            </>
          ) : (
            <>
              Couldn't send an email — let{" "}
              <span className="font-mono text-xs text-foreground">{info?.email}</span> know
              directly.
            </>
          )}{" "}
          They just need to open the hub, enter their email on the sign-in page, and choose their
          own password.
        </p>
        <div className="flex items-center justify-between gap-2 border bg-muted/60 px-3 py-2.5">
          <code className="font-mono text-sm tracking-wide">uuaibiz.vercel.app</code>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() =>
              navigator.clipboard
                .writeText("https://uuaibiz.vercel.app")
                .then(() => toast.success("Copied"))
            }
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewToggle({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`microlabel inline-flex h-8 items-center gap-1.5 px-3 transition-colors ${
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

const IN_PLAY = ["Contacted", "Discussing", "Negotiating"];

type PlanItem = {
  id: string;
  kind: "Task" | "Event" | "Meeting";
  title: string;
  date: string | null;
  overdue: boolean;
  go: () => void;
};

const KIND_COLOR: Record<PlanItem["kind"], string> = {
  Event: "var(--brand-red)",
  Meeting: "var(--status-info)",
  Task: "var(--status-neutral)",
};

/** One card per person: what they own and what's next on their plate. */
function TeamOverview({
  profiles,
  roleMap,
  companies,
  events,
  tasks,
  meId,
  onView,
  visitMap,
}: {
  /** Admins only: last-visit data, shown as "Active … ago" on each card. */
  visitMap?: Map<string, any>;
  profiles: any[];
  roleMap: Map<string, AppRole>;
  companies: any[];
  events: any[];
  tasks: any[];
  meId: string | undefined;
  onView: (p: any) => void;
}) {
  const { data: meetings } = useSuspenseQuery(meetingsQuery);
  const online = useOnlineUsers();
  const navigate = useNavigate();
  const today = new Date(new Date().toDateString());
  const isUpcoming = (d: string | null | undefined) => !!d && parseLocalDate(d) >= today;

  const people = profiles.map((p) => {
    const owns = (row: any) => (row.assignees ?? []).includes(p.id);
    // Someone else's personal tasks are private; never count them here.
    const openTasks = tasks.filter(
      (t) => owns(t) && t.status !== "Done" && (!t.personal || p.id === meId),
    );
    const overdue = openTasks.filter((t) => t.due_date && parseLocalDate(t.due_date) < today);
    const myCompanies = companies.filter(owns);
    const inPlay = myCompanies.filter((c) => IN_PLAY.includes(c.status));
    const booked = myCompanies.filter((c) => c.status === "Booked").length;
    const upcomingEvents = events.filter(
      (e) => owns(e) && isEventActive(e.status) && e.status !== "Completed" && isUpcoming(e.date),
    );

    const plan: PlanItem[] = [
      ...openTasks.map<PlanItem>((t) => ({
        id: `t-${t.id}`,
        kind: "Task",
        title: t.title,
        date: t.due_date,
        overdue: !!t.due_date && parseLocalDate(t.due_date) < today,
        go: () => navigate({ to: "/tasks" }),
      })),
      ...upcomingEvents.map<PlanItem>((e) => ({
        id: `e-${e.id}`,
        kind: "Event",
        title: e.title,
        date: e.date,
        overdue: false,
        go: () => navigate({ to: "/events/$eventId", params: { eventId: e.id } }),
      })),
      ...meetings
        .filter((m) => owns(m) && isUpcoming(m.meeting_date))
        .map<PlanItem>((m) => ({
          id: `m-${m.id}`,
          kind: "Meeting",
          title: m.title,
          date: m.meeting_date,
          overdue: false,
          go: () => navigate({ to: "/meetings" }),
        })),
      ...myCompanies
        .filter((c) => c.meeting_booked && isUpcoming(c.meeting_date))
        .map<PlanItem>((c) => ({
          id: `c-${c.id}`,
          kind: "Meeting",
          title: c.name,
          date: c.meeting_date,
          overdue: false,
          go: () => navigate({ to: "/outreach" }),
        })),
    ].sort(
      (a, b) =>
        Number(b.overdue) - Number(a.overdue) || (a.date ?? "9999").localeCompare(b.date ?? "9999"),
    );

    return { p, openTasks, overdue, inPlay, booked, upcomingEvents, plan };
  });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {people.map(({ p, openTasks, overdue, inPlay, booked, upcomingEvents, plan }) => {
        const role = roleMap.get(p.id);
        return (
          <section key={p.id} className="flex flex-col border bg-card">
            <button
              onClick={() => onView(p)}
              className="flex items-center gap-3 border-b px-4 py-3.5 text-left transition-colors hover:bg-accent/40"
            >
              <OnlineAvatar profile={p} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{p.name || p.email}</span>
                  {p.id === meId && (
                    <span className="microlabel text-[9px] text-muted-foreground">You</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`microlabel text-[9px] ${role === "admin" ? "text-brand" : "text-muted-foreground"}`}
                  >
                    {roleLabel(role)}
                  </span>
                  {visitMap && (
                    <span className="text-[11px] text-muted-foreground">
                      {online.has(p.id)
                        ? "· Online now"
                        : visitMap.get(p.id)?.last_visit_at
                          ? `· Active ${timeAgo(visitMap.get(p.id).last_visit_at)}`
                          : "· Never visited"}
                    </span>
                  )}
                </div>
              </div>
            </button>

            <div className="grid grid-cols-3 divide-x border-b">
              <Figure label="Active companies" value={inPlay.length} sub={`${booked} booked`} />
              <Figure
                label="Upcoming events"
                value={upcomingEvents.length}
                sub={upcomingEvents[0] ? `Next ${formatDate(upcomingEvents[0].date)}` : "None"}
              />
              <Figure
                label="Open tasks"
                value={openTasks.length}
                sub={overdue.length ? `${overdue.length} overdue` : "On track"}
                danger={overdue.length > 0}
              />
            </div>

            <div className="flex-1 px-4 py-3">
              <div className="microlabel mb-1.5 text-[10px] text-muted-foreground">Up next</div>
              {plan.length === 0 ? (
                <p className="py-3 text-xs text-muted-foreground">Nothing on their plate.</p>
              ) : (
                <ul>
                  {plan.slice(0, 4).map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={item.go}
                        className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-[3px] px-2 py-1.5 text-left transition-colors hover:bg-accent/50"
                      >
                        <StatusTag
                          color={KIND_COLOR[item.kind]}
                          className="w-16 shrink-0 text-[9px]"
                        >
                          {item.kind}
                        </StatusTag>
                        <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                        <span
                          className={`microlabel tnum shrink-0 text-[10px] ${item.overdue ? "font-semibold text-brand" : "text-muted-foreground"}`}
                        >
                          {item.date ? formatDate(item.date) : "No date"}
                        </span>
                      </button>
                    </li>
                  ))}
                  {plan.length > 4 && (
                    <li className="microlabel pt-1 text-[9.5px] text-muted-foreground">
                      +{plan.length - 4} more
                    </li>
                  )}
                </ul>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Figure({
  label,
  value,
  sub,
  danger,
}: {
  label: string;
  value: number;
  sub: string;
  danger?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <div className="microlabel truncate text-[9px] text-muted-foreground">{label}</div>
      <div className="tnum mt-1 font-display text-xl font-medium leading-none tracking-tight">
        {value}
      </div>
      <div
        className={`mt-1 truncate text-[11px] ${danger ? "font-medium text-brand" : "text-muted-foreground"}`}
      >
        {sub}
      </div>
    </div>
  );
}
