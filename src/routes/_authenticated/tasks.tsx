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
import { Plus } from "lucide-react";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [mineOnly, setMineOnly] = useState(false);

  const visible = mineOnly ? tasks.filter((t) => t.assigned_to === me?.id) : tasks;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 md:p-10">
      <PageHeader title="Tasks" lede="Team to-dos. Drag between columns to update status.">
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
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New task
        </Button>
      </PageHeader>

      <TaskBoard
        tasks={visible}
        onOpen={(t) => {
          setEditing(t);
          setDialogOpen(true);
        }}
      />

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editing} />
    </div>
  );
}
