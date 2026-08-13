import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useState } from "react";
import {
  TASK_STATUS_ORDER,
  TaskStatus,
  TaskPriority,
  taskStatusColor,
  priorityColor,
} from "./taskStyles";
import { formatDate, parseLocalDate } from "@/lib/format";
import { MemberStack } from "@/components/shared/MemberStack";
import { StatusTag } from "@/components/shared/StatusTag";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { profilesQuery, eventsQuery } from "@/lib/queries";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

function isOverdue(task: any) {
  return (
    task.status !== "Done" &&
    task.due_date &&
    parseLocalDate(task.due_date) < new Date(new Date().toDateString())
  );
}

export function TaskBoard({
  tasks,
  onOpen,
  canEdit = true,
}: {
  tasks: any[];
  onOpen: (t: any) => void;
  canEdit?: boolean;
}) {
  const qc = useQueryClient();
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const { data: events } = useSuspenseQuery(eventsQuery);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: any) => toast.error(e.message),
  });

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const status = e.over?.id as TaskStatus | undefined;
    const id = e.active.id as string;
    if (!status || !TASK_STATUS_ORDER.includes(status)) return;
    const t = tasks.find((x) => x.id === id);
    if (t && t.status !== status) move.mutate({ id, status });
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const eventMap = new Map(events.map((e: any) => [e.id, e]));
  const active = tasks.find((t) => t.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(e.active.id as string)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {TASK_STATUS_ORDER.map((s) => (
          <Column
            key={s}
            status={s}
            tasks={tasks.filter((t) => t.status === s)}
            profileMap={profileMap}
            eventMap={eventMap}
            onOpen={onOpen}
            canEdit={canEdit}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? (
          <Card task={active} profileMap={profileMap} eventMap={eventMap} onOpen={() => {}} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  tasks,
  profileMap,
  eventMap,
  onOpen,
  canEdit,
}: {
  status: TaskStatus;
  tasks: any[];
  profileMap: Map<string, any>;
  eventMap: Map<string, any>;
  onOpen: (t: any) => void;
  canEdit: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: !canEdit });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[160px] flex-col border bg-card/50 md:min-h-[420px] ${isOver ? "bg-accent/60" : ""}`}
      style={{ borderTop: `2px solid ${taskStatusColor[status]}` }}
    >
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <h3 className="microlabel text-[10px]">{status}</h3>
        <span className="microlabel tnum text-[10px] text-muted-foreground">
          {String(tasks.length).padStart(2, "0")}
        </span>
      </div>
      <div className="flex-1 space-y-2 p-2">
        {tasks.map((t) => (
          <DraggableCard
            key={t.id}
            task={t}
            profileMap={profileMap}
            eventMap={eventMap}
            onOpen={onOpen}
            canEdit={canEdit}
          />
        ))}
        {tasks.length === 0 && (
          <div className="microlabel py-6 text-center text-[9.5px] text-muted-foreground/50">—</div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ task, profileMap, eventMap, onOpen, canEdit }: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: !canEdit,
  });
  return (
    <div
      ref={setNodeRef}
      {...(canEdit ? listeners : {})}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1 }}
    >
      <Card task={task} profileMap={profileMap} eventMap={eventMap} onOpen={onOpen} />
    </div>
  );
}

function Card({
  task,
  profileMap,
  eventMap,
  onOpen,
}: {
  task: any;
  profileMap: Map<string, any>;
  eventMap: Map<string, any>;
  onOpen: (t: any) => void;
}) {
  const overdue = isOverdue(task);
  const event = task.related_event_id ? eventMap.get(task.related_event_id) : null;
  return (
    <button
      onClick={() => onOpen(task)}
      className={`w-full cursor-grab border bg-card p-3 text-left transition-colors hover:border-foreground/30 active:cursor-grabbing ${
        overdue ? "border-l-2 border-l-(--brand-red)" : ""
      }`}
    >
      <div className="truncate text-sm font-medium">{task.title}</div>
      {event && (
        <div className="microlabel mt-1.5 flex items-center gap-1 text-[9.5px] text-muted-foreground">
          <CalendarDays className="h-3 w-3 shrink-0" />
          <span className="truncate">{event.title}</span>
        </div>
      )}
      <div className="mt-2 flex items-center gap-3">
        <StatusTag color={priorityColor[task.priority as TaskPriority]} className="text-[9.5px]">
          {task.priority}
        </StatusTag>
        {overdue && <span className="microlabel text-[9.5px] text-brand">Overdue</span>}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <MemberStack ids={task.assignees} profileMap={profileMap} />
        <span
          className={`microlabel tnum text-[9.5px] ${overdue ? "font-semibold text-brand" : "text-muted-foreground/80"}`}
        >
          {task.due_date ? formatDate(task.due_date) : "—"}
        </span>
      </div>
    </button>
  );
}
