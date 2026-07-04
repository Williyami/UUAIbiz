import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { companiesQuery, profilesQuery, eventsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, Table as TableIcon } from "lucide-react";
import { KanbanBoard } from "@/components/outreach/KanbanBoard";
import { CompanyTable } from "@/components/outreach/CompanyTable";
import { CompanyDialog } from "@/components/outreach/CompanyDialog";
import { CompanyDetail } from "@/components/outreach/CompanyDetail";

export const Route = createFileRoute("/_authenticated/outreach")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(companiesQuery);
    context.queryClient.ensureQueryData(profilesQuery);
    context.queryClient.ensureQueryData(eventsQuery);
  },
  component: OutreachPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

function OutreachPage() {
  const { data: companies } = useSuspenseQuery(companiesQuery);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = detailId ? companies.find((c) => c.id === detailId) : null;

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-[1400px] mx-auto">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Outreach</h1>
          <p className="text-sm text-muted-foreground mt-1">Track company outreach across the sales pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border bg-card p-0.5">
            <button onClick={() => setView("kanban")} className={`px-2.5 h-8 inline-flex items-center gap-1.5 text-xs rounded ${view === "kanban" ? "bg-muted font-medium" : "text-muted-foreground"}`}>
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </button>
            <button onClick={() => setView("table")} className={`px-2.5 h-8 inline-flex items-center gap-1.5 text-xs rounded ${view === "table" ? "bg-muted font-medium" : "text-muted-foreground"}`}>
              <TableIcon className="h-3.5 w-3.5" /> Table
            </button>
          </div>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Add company
          </Button>
        </div>
      </header>

      {view === "kanban" ? (
        <KanbanBoard companies={companies} onOpen={(c) => setDetailId(c.id)} />
      ) : (
        <CompanyTable companies={companies} onOpen={(c) => setDetailId(c.id)} />
      )}

      <CompanyDialog open={dialogOpen} onOpenChange={setDialogOpen} company={editing} />
      <CompanyDetail
        company={detail}
        onClose={() => setDetailId(null)}
        onEdit={(c) => { setEditing(c); setDialogOpen(true); setDetailId(null); }}
      />
    </div>
  );
}