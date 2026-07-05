import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { companiesQuery, profilesQuery, eventsQuery, currentUserQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, Table as TableIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KanbanBoard } from "@/components/outreach/KanbanBoard";
import { CompanyTable } from "@/components/outreach/CompanyTable";
import { CompanyDialog } from "@/components/outreach/CompanyDialog";
import { CompanyDetail } from "@/components/outreach/CompanyDetail";

export const Route = createFileRoute("/_authenticated/outreach")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(companiesQuery);
    context.queryClient.ensureQueryData(profilesQuery);
    context.queryClient.ensureQueryData(eventsQuery);
    context.queryClient.ensureQueryData(currentUserQuery);
  },
  component: OutreachPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

function OutreachPage() {
  const { data: companies } = useSuspenseQuery(companiesQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);
  const canEdit = me?.role !== "viewer";
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = detailId ? companies.find((c) => c.id === detailId) : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 md:p-10">
      <PageHeader
        title="Outreach"
        lede="Company pipeline — who we've contacted, and who owns the relationship."
      >
        <div className="inline-flex border bg-card p-0.5">
          <ViewButton
            active={view === "kanban"}
            onClick={() => setView("kanban")}
            icon={LayoutGrid}
            label="Board"
          />
          <ViewButton
            active={view === "table"}
            onClick={() => setView("table")}
            icon={TableIcon}
            label="Table"
          />
        </div>
        {canEdit && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add company
          </Button>
        )}
      </PageHeader>

      {view === "kanban" ? (
        <KanbanBoard companies={companies} onOpen={(c) => setDetailId(c.id)} canEdit={canEdit} />
      ) : (
        <CompanyTable companies={companies} onOpen={(c) => setDetailId(c.id)} />
      )}

      <CompanyDialog open={dialogOpen} onOpenChange={setDialogOpen} company={editing} />
      <CompanyDetail
        company={detail}
        onClose={() => setDetailId(null)}
        canEdit={canEdit}
        onEdit={(c) => {
          setEditing(c);
          setDialogOpen(true);
          setDetailId(null);
        }}
      />
    </div>
  );
}

function ViewButton({
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
