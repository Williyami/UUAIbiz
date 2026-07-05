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
import { Plus, Users, Lock } from "lucide-react";
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
  const [scope, setScope] = useState<"team" | "personal">("team");
  const [mineOnly, setMineOnly] = useState(false);

  // Personal tasks are private to their assignee (enforced by RLS too);
  // the team board never shows them.
  const teamTasks = tasks.filter((t: any) => !t.personal);
  const personalTasks = tasks.filter((t: any) => t.personal && t.assigned_to === me?.id);
  const visible =
    scope === "personal"
      ? personalTasks
      : mineOnly
        ? teamTasks.filter((t) => t.assigned_to === me?.id)
        : teamTasks;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 md:p-10">
      <PageHeader
        title="Tasks"
        lede={
          scope === "team"
            ? "Team to-dos. Drag between columns to update status."
            : "Your private list — only you can see these."
        }
      >
        <div className="inline-flex border bg-card p-0.5">
          <ScopeButton active={scope === "team"} onClick={() => setScope("team")} icon={Users} label="Team" />
          <ScopeButton
            active={scope === "personal"}
            onClick={() => setScope("personal")}
            icon={Lock}
            label="Personal"
          />
        </div>
        {scope === "team" && (
          <button
            onClick={() => setMineOnly((v) => !v)}
            className={`microlabel inline-flex h-9 items-center border px-3 text-[10px] transition-colors ${
              mineOnly
                ? "border-foreground bg-foreground text-background"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            My tasks
          </button>
        )}
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
        defaultPersonal={scope === "personal"}
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
