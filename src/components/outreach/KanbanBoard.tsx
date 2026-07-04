import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { useState } from "react";
import { STATUS_ORDER, CompanyStatus, statusStyles } from "./statusStyles";
import { formatDate, initials } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { profilesQuery } from "@/lib/queries";
import { toast } from "sonner";

const MAIN_STATUSES: CompanyStatus[] = ["Contacted", "Negotiating", "Booked", "Completed"];
const SIDE_STATUSES: CompanyStatus[] = ["Declined", "On hold"];

export function KanbanBoard({ companies, onOpen }: { companies: any[]; onOpen: (c: any) => void }) {
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
    <DndContext sensors={sensors} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {MAIN_STATUSES.map((s) => (
          <Column key={s} status={s} companies={companies.filter((c) => c.status === s)} profileMap={profileMap} onOpen={onOpen} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {SIDE_STATUSES.map((s) => (
          <Column key={s} status={s} companies={companies.filter((c) => c.status === s)} profileMap={profileMap} onOpen={onOpen} muted />
        ))}
      </div>
      <DragOverlay>
        {active ? <Card company={active} profileMap={profileMap} onOpen={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ status, companies, profileMap, onOpen, muted }: { status: CompanyStatus; companies: any[]; profileMap: Map<string, any>; onOpen: (c: any) => void; muted?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={`rounded-xl border bg-card/60 flex flex-col min-h-[280px] ${isOver ? "ring-2 ring-[color:var(--brand-red)]/40" : ""}`}>
      <div className={`px-3 py-2.5 border-b flex items-center justify-between ${muted ? "opacity-80" : ""}`}>
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${statusDot(status)}`} />
          <h3 className="text-xs font-semibold uppercase tracking-wide">{status}</h3>
        </div>
        <span className="text-[11px] text-muted-foreground">{companies.length}</span>
      </div>
      <div className="p-2 space-y-2 flex-1">
        {companies.map((c) => (
          <DraggableCard key={c.id} company={c} profileMap={profileMap} onOpen={onOpen} />
        ))}
        {companies.length === 0 && <div className="text-[11px] text-muted-foreground text-center py-6">Empty</div>}
      </div>
    </div>
  );
}

function DraggableCard({ company, profileMap, onOpen }: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: company.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.3 : 1 }}>
      <Card company={company} profileMap={profileMap} onOpen={onOpen} />
    </div>
  );
}

function Card({ company, profileMap, onOpen }: { company: any; profileMap: Map<string, any>; onOpen: (c: any) => void }) {
  const assignee = company.assigned_to ? profileMap.get(company.assigned_to) : null;
  return (
    <button
      onClick={() => onOpen(company)}
      className="w-full text-left rounded-lg border bg-card p-3 hover:border-foreground/20 hover:shadow-sm transition cursor-grab active:cursor-grabbing"
    >
      <div className="text-sm font-medium truncate">{company.name}</div>
      {company.contact_person && <div className="text-[11px] text-muted-foreground truncate">{company.contact_person}</div>}
      <div className="mt-2 flex items-center justify-between">
        {assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold">{initials(assignee.name || assignee.email)}</div>
            <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">{(assignee.name || assignee.email).split(" ")[0]}</span>
          </div>
        ) : <span className="text-[11px] text-muted-foreground">Unassigned</span>}
        <span className="text-[10px] text-muted-foreground">{company.last_contact_date ? formatDate(company.last_contact_date) : "—"}</span>
      </div>
    </button>
  );
}

function statusDot(s: CompanyStatus) {
  return {
    "Contacted": "bg-slate-400",
    "Negotiating": "bg-amber-500",
    "Booked": "bg-blue-500",
    "Completed": "bg-emerald-500",
    "Declined": "bg-rose-500",
    "On hold": "bg-neutral-400",
  }[s];
}

// keep statusStyles referenced (silence unused import warnings)
export { statusStyles };