import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { companiesQuery, contactsQuery, currentUserQuery } from "@/lib/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContactDialog } from "@/components/contacts/ContactDialog";
import { CompanyContactDialog } from "@/components/contacts/CompanyContactDialog";
import { Plus, Search, Mail, Phone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/contacts")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(companiesQuery);
    context.queryClient.ensureQueryData(contactsQuery);
  },
  component: ContactsPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

type Row = {
  id: string;
  kind: "company" | "manual";
  name: string;
  role: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: any;
};

function ContactsPage() {
  const { data: companies } = useSuspenseQuery(companiesQuery);
  const { data: contacts } = useSuspenseQuery(contactsQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);
  const canEdit = me?.role !== "viewer";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [companyEditing, setCompanyEditing] = useState<any>(null);
  const [q, setQ] = useState("");

  const fromOutreach: Row[] = companies
    .filter((c: any) => c.contact_person || c.contact_email || c.contact_phone)
    .map((c: any) => ({
      id: `company-${c.id}`,
      kind: "company" as const,
      name: c.contact_person || "Unnamed contact",
      role: null,
      company: c.name,
      email: c.contact_email,
      phone: c.contact_phone,
      source: c,
    }));

  const manual: Row[] = contacts.map((c: any) => ({
    id: c.id,
    kind: "manual" as const,
    name: c.name,
    role: c.role,
    company: c.company?.name || c.company_name,
    email: c.email,
    phone: c.phone,
    source: c,
  }));

  const needle = q.trim().toLowerCase();
  const rows = [...fromOutreach, ...manual]
    .filter(
      (r) =>
        !needle ||
        [r.name, r.company, r.email, r.role]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(needle)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));

  function open(row: Row) {
    if (row.kind === "company") {
      setCompanyEditing(row.source);
      setCompanyDialogOpen(true);
    } else if (canEdit) {
      setEditing(row.source);
      setDialogOpen(true);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <PageHeader
        title="Contacts"
        lede="Everyone we know — pulled from Outreach automatically, plus anyone added by hand."
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

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, company, email…"
          className="pl-9"
        />
      </div>

      <section className="border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-display text-base font-medium tracking-tight">All contacts</h2>
          <span className="microlabel tnum text-[10px] text-muted-foreground">{rows.length}</span>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            {needle
              ? "No contacts match your search."
              : "No contacts yet. Add a company with a contact person in Outreach, or add one manually."}
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => (
              <li
                key={row.id}
                onClick={() => open(row)}
                className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{row.name}</div>
                  <div className="microlabel mt-0.5 truncate text-[9.5px] text-muted-foreground/80">
                    {[row.role, row.company].filter(Boolean).join(" · ") || "No company"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {row.email && (
                    <span className="microlabel mr-1 hidden max-w-52 truncate text-[9.5px] text-muted-foreground md:inline">
                      {row.email}
                    </span>
                  )}
                  <span className="microlabel mr-1.5 hidden text-[9px] text-muted-foreground/60 sm:inline">
                    {row.kind === "company" ? "Outreach" : "Manual"}
                  </span>
                  {row.email && (
                    <a
                      href={`mailto:${row.email}`}
                      onClick={(e) => e.stopPropagation()}
                      title={row.email}
                      className="rounded-[3px] border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {row.phone && (
                    <a
                      href={`tel:${row.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      title={row.phone}
                      className="rounded-[3px] border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ContactDialog open={dialogOpen} onOpenChange={setDialogOpen} contact={editing} />
      <CompanyContactDialog
        open={companyDialogOpen}
        onOpenChange={setCompanyDialogOpen}
        company={companyEditing}
        canEdit={canEdit}
      />
    </div>
  );
}
