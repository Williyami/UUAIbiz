import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  tasksQuery,
  profilesQuery,
  companiesQuery,
  eventsQuery,
  currentUserQuery,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Plus, Users, User } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskDialog } from "@/components/tasks/TaskDialog";

export const Route = createFileRoute("/_authenticated/tasks")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(tasksQuery);
    context.queryClient.ensureQueryData(profilesQuery);
    context.queryClient.ensureQueryData(companiesQuery);
    context.queryClient.ensureQueryData(eventsQuery);
  },
  component: TasksPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

function TasksPage() {
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);
  const canEdit = me?.role !== "viewer";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  // Defaults to your own list — the board opens on what you're responsible for
  // rather than everything the team has.
  const [mineOnly, setMineOnly] = useState(true);

  // Anything assigned to me, personal items included. Someone else's personal
  // task never matches, since it isn't assigned to me (and RLS blocks it too).
  const myTasks = tasks.filter((t: any) => me?.id && (t.assignees ?? []).includes(me.id));
  // The team board excludes personal items entirely, whoever owns them.
  const teamTasks = tasks.filter((t: any) => !t.personal);
  const visible = mineOnly ? myTasks : teamTasks;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 md:p-10">
      <PageHeader
        title="Tasks"
        lede={
          mineOnly
            ? "Everything assigned to you, private items included. Drag between columns to update status."
            : "All team to-dos. Personal items stay hidden."
        }
      >
        <div className="inline-flex border bg-card p-0.5">
          <ScopeButton active={mineOnly} onClick={() => setMineOnly(true)} icon={User} label="My tasks" />
          <ScopeButton
            active={!mineOnly}
            onClick={() => setMineOnly(false)}
            icon={Users}
            label="All team"
          />
        </div>
        {canEdit && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New task
          </Button>
        )}
      </PageHeader>

      <TaskBoard
        tasks={visible}
        canEdit={canEdit}
        onOpen={(t) => {
          setEditing(t);
          setDialogOpen(true);
        }}
      />

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editing}
        canEdit={canEdit}
        defaultPersonal={false}
      />
    </div>
  );
}

function ScopeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`microlabel inline-flex h-8 items-center gap-1.5 px-3 text-[10px] transition-colors ${
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
