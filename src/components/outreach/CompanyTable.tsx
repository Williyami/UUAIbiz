import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusStyles, STATUS_ORDER, CompanyStatus } from "./statusStyles";
import { formatDate, initials } from "@/lib/format";
import { useSuspenseQuery } from "@tanstack/react-query";
import { profilesQuery } from "@/lib/queries";

export function CompanyTable({ companies, onOpen }: { companies: any[]; onOpen: (c: any) => void }) {
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [assignee, setAssignee] = useState<string>("all");
  const [source, setSource] = useState<string>("all");

  const sources = Array.from(new Set(companies.map((c) => c.source).filter(Boolean))) as string[];
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const rows = useMemo(() => {
    return companies.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (assignee !== "all" && c.assigned_to !== (assignee === "none" ? null : assignee)) return false;
      if (source !== "all" && c.source !== source) return false;
      if (q && !`${c.name} ${c.contact_person ?? ""} ${c.contact_email ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [companies, q, status, assignee, source]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search…" className="max-w-xs h-9" value={q} onChange={(e) => setQ(e.target.value)} />
        <FilterSelect value={status} onChange={setStatus} placeholder="Status">
          <SelectItem value="all">All statuses</SelectItem>
          {STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </FilterSelect>
        <FilterSelect value={assignee} onChange={setAssignee} placeholder="Assignee">
          <SelectItem value="all">All assignees</SelectItem>
          <SelectItem value="none">Unassigned</SelectItem>
          {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>)}
        </FilterSelect>
        <FilterSelect value={source} onChange={setSource} placeholder="Source">
          <SelectItem value="all">All sources</SelectItem>
          {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </FilterSelect>
        <span className="text-xs text-muted-foreground ml-auto">{rows.length} of {companies.length}</span>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
            <tr>
              <Th>Company</Th>
              <Th>Contact</Th>
              <Th>Status</Th>
              <Th>Assigned</Th>
              <Th>Source</Th>
              <Th>Last contact</Th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((c) => {
              const a = c.assigned_to ? profileMap.get(c.assigned_to) : null;
              return (
                <tr key={c.id} onClick={() => onOpen(c)} className="hover:bg-muted/40 cursor-pointer">
                  <Td><div className="font-medium">{c.name}</div></Td>
                  <Td>
                    <div className="text-xs">{c.contact_person || "—"}</div>
                    <div className="text-[11px] text-muted-foreground">{c.contact_email || ""}</div>
                  </Td>
                  <Td>
                    <span className={`inline-flex text-[11px] px-2 py-0.5 rounded-full border ${statusStyles[c.status as CompanyStatus]}`}>{c.status}</span>
                  </Td>
                  <Td>
                    {a ? (
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold">{initials(a.name || a.email)}</div>
                        <span className="text-xs">{a.name || a.email}</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </Td>
                  <Td><span className="text-xs">{c.source || "—"}</span></Td>
                  <Td><span className="text-xs">{formatDate(c.last_contact_date)}</span></Td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No companies match your filters</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, children }: any) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function Th({ children }: any) { return <th className="text-left font-medium px-4 py-2.5">{children}</th>; }
function Td({ children }: any) { return <td className="px-4 py-3 align-top">{children}</td>; }