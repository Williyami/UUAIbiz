import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_ORDER, CompanyStatus, companyStatusColor } from "./statusStyles";
import { StatusTag } from "@/components/shared/StatusTag";
import { MemberChip } from "@/components/shared/MemberChip";
import { formatDate } from "@/lib/format";
import { useSuspenseQuery } from "@tanstack/react-query";
import { profilesQuery } from "@/lib/queries";

export function CompanyTable({
  companies,
  onOpen,
}: {
  companies: any[];
  onOpen: (c: any) => void;
}) {
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
      if (assignee !== "all" && c.assigned_to !== (assignee === "none" ? null : assignee))
        return false;
      if (source !== "all" && c.source !== source) return false;
      if (
        q &&
        !`${c.name} ${c.contact_person ?? ""} ${c.contact_email ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
        return false;
      return true;
    });
  }, [companies, q, status, assignee, source]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search…"
            className="h-9 pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <FilterSelect value={status} onChange={setStatus} placeholder="Status">
          <SelectItem value="all">All statuses</SelectItem>
          {STATUS_ORDER.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect value={assignee} onChange={setAssignee} placeholder="Assignee">
          <SelectItem value="all">All assignees</SelectItem>
          <SelectItem value="none">Unassigned</SelectItem>
          {profiles.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name || p.email}
            </SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect value={source} onChange={setSource} placeholder="Source">
          <SelectItem value="all">All sources</SelectItem>
          {sources.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </FilterSelect>
        <span className="microlabel tnum ml-auto text-[10px] text-muted-foreground">
          {rows.length} / {companies.length}
        </span>
      </div>

      <div className="overflow-x-auto border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <Th>Company</Th>
              <Th>Contact</Th>
              <Th>Status</Th>
              <Th>Assigned</Th>
              <Th>Source</Th>
              <Th className="text-right">Last contact</Th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((c) => {
              const a = c.assigned_to ? profileMap.get(c.assigned_to) : null;
              return (
                <tr
                  key={c.id}
                  onClick={() => onOpen(c)}
                  className="cursor-pointer transition-colors hover:bg-accent/50"
                >
                  <Td>
                    <span className="font-medium">{c.name}</span>
                  </Td>
                  <Td>
                    <div className="text-xs">{c.contact_person || "—"}</div>
                    {c.contact_email && (
                      <div className="font-mono text-[10.5px] text-muted-foreground">
                        {c.contact_email}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <StatusTag color={companyStatusColor[c.status as CompanyStatus]}>
                      {c.status}
                    </StatusTag>
                  </Td>
                  <Td>
                    <MemberChip name={a ? a.name || a.email : null} />
                  </Td>
                  <Td>
                    <span className="text-xs text-muted-foreground">{c.source || "—"}</span>
                  </Td>
                  <Td className="text-right">
                    <span className="microlabel tnum text-[10px] text-muted-foreground">
                      {formatDate(c.last_contact_date)}
                    </span>
                  </Td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-sm text-muted-foreground">
                  No companies match your filters
                </td>
              </tr>
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
      <SelectTrigger className="h-9 w-[160px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function Th({ children, className = "" }: any) {
  return (
    <th
      className={`microlabel px-4 py-2.5 text-left text-[10px] text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}
function Td({ children, className = "" }: any) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}
