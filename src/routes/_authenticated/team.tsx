import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  profilesQuery,
  userRolesQuery,
  companiesQuery,
  eventsQuery,
  tasksQuery,
  currentUserQuery,
} from "@/lib/queries";
import {
  createTeamMember,
  deleteTeamMember,
  setMemberRole,
  resetMemberPassword,
} from "@/lib/team.functions";
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
import { initials } from "@/lib/format";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Copy, KeyRound, ShieldCheck, UserMinus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/team")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(profilesQuery);
    context.queryClient.ensureQueryData(userRolesQuery);
    context.queryClient.ensureQueryData(companiesQuery);
    context.queryClient.ensureQueryData(eventsQuery);
    context.queryClient.ensureQueryData(tasksQuery);
  },
  component: TeamPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

function TeamPage() {
  const qc = useQueryClient();
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const { data: roles } = useSuspenseQuery(userRolesQuery);
  const { data: companies } = useSuspenseQuery(companiesQuery);
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);

  const [addOpen, setAddOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(
    null,
  );

  const adminIds = new Set(roles.filter((r) => r.role === "admin").map((r) => r.user_id));

  const reset = useMutation({
    mutationFn: (userId: string) => resetMemberPassword({ data: { userId } }),
    onSuccess: (res, userId) => {
      const p = profiles.find((x) => x.id === userId);
      setTempPassword({ email: p?.email ?? "", password: res.tempPassword });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "admin" | "member" }) =>
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <PageHeader title="Team" lede="Who has access to the hub, and what they own.">
        {me?.isAdmin && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add member
          </Button>
        )}
      </PageHeader>

      <div className="divide-y border bg-card">
        {profiles.map((p) => {
          const isAdmin = adminIds.has(p.id);
          const owned = {
            companies: companies.filter((c) => c.assigned_to === p.id).length,
            events: events.filter((e) => e.assigned_to === p.id).length,
            tasks: tasks.filter((t) => t.assigned_to === p.id && t.status !== "Done").length,
          };
          return (
            <div key={p.id} className="flex items-center gap-4 px-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] bg-foreground/85 font-mono text-xs font-semibold uppercase text-background">
                {initials(p.name || p.email)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{p.name || p.email}</span>
                  {p.id === me?.id && (
                    <span className="microlabel text-[9px] text-muted-foreground">You</span>
                  )}
                  <span
                    className={`microlabel text-[9px] ${isAdmin ? "text-brand" : "text-muted-foreground"}`}
                  >
                    {isAdmin ? "Admin" : "Member"}
                  </span>
                </div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">
                  {p.email}
                </div>
              </div>
              <div className="microlabel tnum hidden gap-4 text-[10px] text-muted-foreground sm:flex">
                <span>{owned.companies} companies</span>
                <span>{owned.events} events</span>
                <span>{owned.tasks} open tasks</span>
              </div>
              {me?.isAdmin && p.id !== me.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        changeRole.mutate({ userId: p.id, role: isAdmin ? "member" : "admin" })
                      }
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Make {isAdmin ? "member" : "admin"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => reset.mutate(p.id)}>
                      <KeyRound className="h-3.5 w-3.5" /> Reset password
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() =>
                        confirm(`Remove ${p.name || p.email} from the team?`) && remove.mutate(p.id)
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

      {!me?.isAdmin && (
        <p className="microlabel text-[10px] text-muted-foreground/70">
          Only admins can add or manage team members.
        </p>
      )}

      <AddMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(email, password) => setTempPassword({ email, password })}
      />
      <TempPasswordDialog cred={tempPassword} onClose={() => setTempPassword(null)} />
    </div>
  );
}

function AddMemberDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (email: string, password: string) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");

  const create = useMutation({
    mutationFn: () => createTeamMember({ data: { name, email, role } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["userRoles"] });
      toast.success("Account created");
      onOpenChange(false);
      onCreated(email, res.tempPassword);
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
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
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

function TempPasswordDialog({
  cred,
  onClose,
}: {
  cred: { email: string; password: string } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!cred} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-medium tracking-tight">
            Temporary password
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Share this with <span className="font-mono text-xs text-foreground">{cred?.email}</span>.
          They'll be asked to replace it on first login — it won't be shown again.
        </p>
        <div className="flex items-center justify-between gap-2 border bg-muted/60 px-3 py-2.5">
          <code className="font-mono text-sm tracking-wide">{cred?.password}</code>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              if (cred)
                navigator.clipboard.writeText(cred.password).then(() => toast.success("Copied"));
            }}
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
