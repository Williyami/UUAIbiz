import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { companiesQuery, contactsQuery, currentUserQuery } from "@/lib/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusTag } from "@/components/shared/StatusTag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContactDialog } from "@/components/contacts/ContactDialog";
import { companyStatusColor, type CompanyStatus } from "@/components/outreach/statusStyles";
import { initials } from "@/lib/format";
import { Plus, Search, Mail, Phone, Building2, LayoutGrid, List } from "lucide-react";
import { errorMessage } from "@/lib/chunk-error";

export const Route = createFileRoute("/_authenticated/contacts")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(companiesQuery);
    context.queryClient.ensureQueryData(contactsQuery);
  },
  component: ContactsPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">Error: {errorMessage(error)}</div>
  ),
});

type Row = {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  companyId: string | null;
  companyStatus: CompanyStatus | null;
  primary: boolean;
  email: string | null;
  phone: string | null;
  notes: string | null;
  source: any;
};

type Group = {
  key: string;
  label: string;
  status: CompanyStatus | null;
  rows: Row[];
};

// Stable pale tint per company, so everyone from the same company shares a
// colour and the grid reads by organisation at a glance.
const HUES = [25, 62, 98, 140, 172, 202, 232, 300, 335];
function tint(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const hue = HUES[Math.abs(h) % HUES.length];
  return {
    backgroundColor: `oklch(0.9 0.05 ${hue})`,
    color: `oklch(0.38 0.08 ${hue})`,
  };
}

function ContactsPage() {
  const { data: contacts } = useSuspenseQuery(contactsQuery);
  const { data: companies } = useSuspenseQuery(companiesQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);
  const canEdit = me?.role !== "viewer";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"company" | "alpha">("company");

  const companyById = new Map(companies.map((c) => [c.id, c]));

  // Every company contact now lives in public.contacts — the inline
  // contact_* columns on a company mirror whichever of them is primary. Listing
  // both sources would show each of those people twice.
  const all: Row[] = contacts.map((c: any) => {
    const company = c.company_id ? companyById.get(c.company_id) : undefined;
    return {
      id: c.id,
      name: c.name,
      role: c.role,
      company: c.company?.name || c.company_name,
      companyId: c.company_id,
      companyStatus: (company?.status as CompanyStatus) ?? null,
      primary: !!company && company.primary_contact_id === c.id,
      email: c.email,
      phone: c.phone,
      notes: c.notes,
      source: c,
    };
  });

  const needle = q.trim().toLowerCase();
  const rows = all
    .filter(
      (r) =>
        !needle ||
        [r.name, r.company, r.email, r.role]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(needle)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));

  const groups: Group[] = view === "company" ? groupByCompany(rows) : groupByLetter(rows);
  const companyCount = new Set(all.map((r) => r.companyId ?? r.company).filter(Boolean)).size;

  function open(row: Row) {
    if (!canEdit) return;
    setEditing(row.source);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <PageHeader
        title="Contacts"
        lede={`${all.length} people across ${companyCount} ${companyCount === 1 ? "company" : "companies"}, pulled from Outreach automatically plus anyone added by hand.`}
      >
        {canEdit && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add contact
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, company, email…"
            className="h-9 bg-card pl-9"
          />
        </div>
        <div className="inline-flex border bg-card p-0.5">
          <ViewButton
            active={view === "company"}
            onClick={() => setView("company")}
            icon={LayoutGrid}
          >
            By company
          </ViewButton>
          <ViewButton active={view === "alpha"} onClick={() => setView("alpha")} icon={List}>
            A–Z
          </ViewButton>
        </div>
        {needle && (
          <span className="microlabel tnum text-[10px] text-muted-foreground">
            {rows.length} of {all.length}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed bg-card/50 px-6 py-16 text-center text-sm text-muted-foreground">
          {needle
            ? "No contacts match your search."
            : "No contacts yet. Add a company with a contact person in Outreach, or add one manually."}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.key}>
              <div className="mb-3 flex items-center gap-3 border-b pb-2">
                {view === "company" && (
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <h2 className="font-display text-base font-medium tracking-tight">{g.label}</h2>
                {g.status && (
                  <StatusTag color={companyStatusColor[g.status]} className="text-[9.5px]">
                    {g.status}
                  </StatusTag>
                )}
                <span className="microlabel tnum ml-auto text-[10px] text-muted-foreground">
                  {g.rows.length} {g.rows.length === 1 ? "person" : "people"}
                </span>
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.rows.map((row) => (
                  <li key={row.id}>
                    <ContactCard
                      row={row}
                      showCompany={view === "alpha"}
                      canEdit={canEdit}
                      onOpen={() => open(row)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ContactDialog open={dialogOpen} onOpenChange={setDialogOpen} contact={editing} />
    </div>
  );
}

function groupByCompany(rows: Row[]): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const key = r.companyId ?? (r.company ? `name:${r.company}` : "none");
    if (!map.has(key))
      map.set(key, {
        key,
        label: r.company || "No company",
        status: r.companyStatus,
        rows: [],
      });
    map.get(key)!.rows.push(r);
  }
  for (const g of map.values()) g.rows.sort((a, b) => Number(b.primary) - Number(a.primary));
  // Companies alphabetically; people without one at the end
  return [...map.values()].sort((a, b) =>
    a.key === "none" ? 1 : b.key === "none" ? -1 : a.label.localeCompare(b.label, "sv"),
  );
}

function groupByLetter(rows: Row[]): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const letter = r.name.trim().charAt(0).toLocaleUpperCase("sv") || "#";
    const key = /\p{L}/u.test(letter) ? letter : "#";
    if (!map.has(key)) map.set(key, { key, label: key, status: null, rows: [] });
    map.get(key)!.rows.push(r);
  }
  return [...map.values()];
}

function ContactCard({
  row,
  showCompany,
  canEdit,
  onOpen,
}: {
  row: Row;
  showCompany: boolean;
  canEdit: boolean;
  onOpen: () => void;
}) {
  return (
    <div
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (canEdit && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`group flex h-full flex-col border bg-card p-4 transition-colors ${
        canEdit ? "cursor-pointer hover:border-foreground/30" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase"
          style={tint(row.companyId ?? row.company ?? row.name)}
        >
          {initials(row.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{row.name}</span>
            {row.primary && (
              <span
                title="Primary contact for this company"
                className="microlabel shrink-0 border border-brand/40 px-1 py-px text-[9px] text-brand"
              >
                Primary
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {row.role || "No role noted"}
          </div>
          {showCompany && (
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs">
              <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{row.company || "No company"}</span>
            </div>
          )}
        </div>
      </div>

      {row.notes && (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {row.notes}
        </p>
      )}

      <div className="mt-auto flex items-center gap-1.5 pt-4">
        {row.email ? (
          <a
            href={`mailto:${row.email}`}
            onClick={(e) => e.stopPropagation()}
            title={`Email ${row.email}`}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-[3px] border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{row.email}</span>
          </a>
        ) : (
          <span className="flex-1 px-0.5 text-xs text-muted-foreground/70">No email</span>
        )}
        {row.phone && (
          <a
            href={`tel:${row.phone}`}
            onClick={(e) => e.stopPropagation()}
            title={`Call ${row.phone}`}
            className="shrink-0 rounded-[3px] border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function ViewButton({
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
