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
import { STATUS_ORDER, CompanyStatus, companyStatusColor } from "./statusStyles";
import { formatDate } from "@/lib/format";
import { MemberChip } from "@/components/shared/MemberChip";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { profilesQuery } from "@/lib/queries";
import { toast } from "sonner";

const MAIN_STATUSES: CompanyStatus[] = ["Contacted", "Negotiating", "Booked", "Completed"];
const SIDE_STATUSES: CompanyStatus[] = ["Declined", "On hold"];

export function KanbanBoard({
  companies,
  onOpen,
  canEdit = true,
}: {
  companies: any[];
  onOpen: (c: any) => void;
  canEdit?: boolean;
}) {
  const qc = useQueryClient();
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CompanyStatus }) => {
      const { error } = await supabase.from("companies").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
    onError: (e: any) => toast.error(e.message),
  });

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const status = e.over?.id as CompanyStatus | undefined;
    const id = e.active.id as string;
    if (!status || !STATUS_ORDER.includes(status)) return;
    const c = companies.find((x) => x.id === id);
    if (c && c.status !== status) move.mutate({ id, status });
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const active = companies.find((c) => c.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(e.active.id as string)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {MAIN_STATUSES.map((s) => (
          <Column
            key={s}
            status={s}
            companies={companies.filter((c) => c.status === s)}
            profileMap={profileMap}
            onOpen={onOpen}
            canEdit={canEdit}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {SIDE_STATUSES.map((s) => (
          <Column
            key={s}
            status={s}
            companies={companies.filter((c) => c.status === s)}
            profileMap={profileMap}
            onOpen={onOpen}
            canEdit={canEdit}
            muted
          />
        ))}
      </div>
      <DragOverlay>
        {active ? <Card company={active} profileMap={profileMap} onOpen={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  companies,
  profileMap,
  onOpen,
  canEdit,
  muted,
}: {
  status: CompanyStatus;
  companies: any[];
  profileMap: Map<string, any>;
  onOpen: (c: any) => void;
  canEdit: boolean;
  muted?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: !canEdit });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[280px] flex-col border bg-card/50 ${isOver ? "bg-accent/60" : ""} ${muted ? "opacity-85" : ""}`}
      style={{ borderTop: `2px solid ${companyStatusColor[status]}` }}
    >
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <h3 className="microlabel text-[10px]">{status}</h3>
        <span className="microlabel tnum text-[10px] text-muted-foreground">
          {String(companies.length).padStart(2, "0")}
        </span>
      </div>
      {/* Cap at roughly six cards; longer columns scroll inside themselves. */}
      <div className="max-h-[560px] flex-1 space-y-2 overflow-y-auto p-2">
        {companies.map((c) => (
          <DraggableCard
            key={c.id}
            company={c}
            profileMap={profileMap}
            onOpen={onOpen}
            canEdit={canEdit}
          />
        ))}
        {companies.length === 0 && (
          <div className="microlabel py-6 text-center text-[9.5px] text-muted-foreground/50">—</div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ company, profileMap, onOpen, canEdit }: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: company.id,
    disabled: !canEdit,
  });
  return (
    <div
      ref={setNodeRef}
      {...(canEdit ? listeners : {})}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1 }}
    >
      <Card company={company} profileMap={profileMap} onOpen={onOpen} />
    </div>
  );
}

function Card({
  company,
  profileMap,
  onOpen,
}: {
  company: any;
  profileMap: Map<string, any>;
  onOpen: (c: any) => void;
}) {
  const assignee = company.assigned_to ? profileMap.get(company.assigned_to) : null;
  return (
    <button
      onClick={() => onOpen(company)}
      className="w-full cursor-grab border bg-card p-3 text-left transition-colors hover:border-foreground/30 active:cursor-grabbing"
    >
      <div className="truncate text-sm font-medium">{company.name}</div>
      {company.contact_person && (
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {company.contact_person}
        </div>
      )}
      {company.industry && (
        <div className="microlabel mt-1 text-[9px] text-muted-foreground/70">
          {company.industry}
        </div>
      )}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <MemberChip
          name={assignee ? assignee.name || assignee.email : null}
          avatarUrl={assignee?.avatar_url}
        />
        <span className="microlabel tnum text-[9.5px] text-muted-foreground/80">
          {company.last_contact_date ? formatDate(company.last_contact_date) : "—"}
        </span>
      </div>
    </button>
  );
}
