import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  contractsQuery,
  contractTemplatesQuery,
  currentUserQuery,
  profilesQuery,
} from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tri } from "@/components/shared/Tri";
import { EVENT_TYPE_ORDER, EventType } from "@/components/events/eventStyles";
import { downloadContractPdf } from "@/lib/contract-pdf";
import { formatSEK, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Download, Eye, Trash2, Settings2 } from "lucide-react";

type ContractSearch = { company?: string; contact?: string };

export const Route = createFileRoute("/_authenticated/contracts")({
  validateSearch: (search: Record<string, unknown>): ContractSearch => ({
    company: typeof search.company === "string" ? search.company : undefined,
    contact: typeof search.contact === "string" ? search.contact : undefined,
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(contractsQuery);
    context.queryClient.ensureQueryData(contractTemplatesQuery);
    context.queryClient.ensureQueryData(profilesQuery);
  },
  component: ContractsPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

function fillTemplate(tpl: string, vars: Record<string, string>) {
  return tpl
    .replace(/\{(name|pricing|custom_terms|signatory)\}/g, (_, k) => vars[k] ?? "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function ContractsPage() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const { data: contracts } = useSuspenseQuery(contractsQuery);
  const { data: templates } = useSuspenseQuery(contractTemplatesQuery);
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);

  const [language, setLanguage] = useState<"en" | "sv">("en");
  const [company, setCompany] = useState(search.company ?? "");
  const [contact, setContact] = useState(search.contact ?? "");
  const [eventType, setEventType] = useState<EventType>("Lunch lecture");
  const [price, setPrice] = useState<string>("");
  const [foodNote, setFoodNote] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [customTerms, setCustomTerms] = useState("");
  const [signatory, setSignatory] = useState("");
  const [viewing, setViewing] = useState<any | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const template = templates.find((t) => t.language === language);
  const pricing = (template?.pricing ?? {}) as Record<string, number>;
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Prefill from ?company=&contact= (Generate contract button on a company)
  useEffect(() => {
    if (search.company) setCompany(search.company);
    if (search.contact) setContact(search.contact);
  }, [search.company, search.contact]);

  // Suggest standard price when the event type changes (manual override allowed)
  useEffect(() => {
    const suggested = pricing[eventType];
    if (suggested != null && Number(suggested) > 0) setPrice(String(suggested));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, template?.language]);

  useEffect(() => {
    if (!signatory && me?.profile?.name) setSignatory(me.profile.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.profile?.name]);

  useEffect(() => {
    if (!foodNote)
      setFoodNote(language === "sv" ? "ca 80 SEK per deltagare" : "approx. 80 SEK per participant");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const sv = language === "sv";
  const pricingBlock = useMemo(() => {
    const lines = [
      `${sv ? "Typ av event" : "Event type"}: ${eventType}`,
      eventDate ? `${sv ? "Datum" : "Event date"}: ${eventDate}` : null,
      `${sv ? "Pris" : "Price"}: ${formatSEK(Number(price || 0))}`,
      foodNote ? `${sv ? "Mat" : "Food"}: ${foodNote}` : null,
    ].filter(Boolean);
    return lines.join("\n");
  }, [sv, eventType, eventDate, price, foodNote]);

  const preview = useMemo(() => {
    if (!template) return "";
    return fillTemplate(template.template, {
      name: contact || (sv ? "[Namn]" : "[Name]"),
      pricing: pricingBlock,
      custom_terms: customTerms.trim()
        ? `${sv ? "Ytterligare villkor" : "Additional terms"}:\n${customTerms.trim()}`
        : "",
      signatory: signatory || (sv ? "[Namn]" : "[Name]"),
    });
  }, [template, contact, pricingBlock, customTerms, signatory, sv]);

  const generate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contracts").insert({
        company_name: company.trim(),
        event_type: eventType,
        price: Number(price || 0),
        custom_terms: customTerms.trim() || null,
        language,
        content_snapshot: preview,
        generated_by: me?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      downloadContractPdf(preview, {
        companyName: company.trim(),
        eventType,
        eventDate: eventDate || null,
        price: Number(price || 0),
        language,
        generatedByName: me?.profile?.name,
      });
      toast.success("Contract exported and logged");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contract removed from log");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-6 md:p-10">
      <PageHeader
        title="Contracts"
        lede="Fill in the details, check the preview, export a PDF. No AI involved — just the standard terms."
      >
        {me?.isAdmin && (
          <Button variant="outline" onClick={() => setTemplatesOpen(true)}>
            <Settings2 className="h-4 w-4" /> Edit templates
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Form */}
        <section className="h-fit border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-display text-base font-medium tracking-tight">
              {sv ? "Detaljer" : "Details"}
            </h2>
            <div className="inline-flex border p-0.5">
              {(["en", "sv"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`microlabel px-2.5 py-1 text-[10px] transition-colors ${
                    language === l
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l === "en" ? "English" : "Svenska"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label={sv ? "Företag" : "Company name"}>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} />
              </Field>
              <Field label={sv ? "Kontaktperson" : "Contact person"}>
                <Input value={contact} onChange={(e) => setContact(e.target.value)} />
              </Field>
            </div>
            <Field label={sv ? "Typ av event" : "Event type"}>
              <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_ORDER.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                      {pricing[t] ? ` · ${formatSEK(pricing[t])}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`${sv ? "Pris" : "Price"} (SEK)`}>
                <Input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </Field>
              <Field label={sv ? "Eventdatum" : "Event date"}>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </Field>
            </div>
            <Field label={sv ? "Matkostnad (notering)" : "Food cost note"}>
              <Input value={foodNote} onChange={(e) => setFoodNote(e.target.value)} />
            </Field>
            <Field label={sv ? "Ytterligare villkor" : "Custom / additional terms"}>
              <Textarea
                rows={3}
                value={customTerms}
                onChange={(e) => setCustomTerms(e.target.value)}
                placeholder={sv ? "Valfritt…" : "Optional…"}
              />
            </Field>
            <Field label={sv ? "Undertecknare (UUAIS)" : "Our signatory"}>
              <Input value={signatory} onChange={(e) => setSignatory(e.target.value)} />
            </Field>
            <Button
              className="w-full"
              disabled={generate.isPending || me?.role === "viewer"}
              title={me?.role === "viewer" ? "Viewers can preview but not export" : undefined}
              onClick={() => {
                if (!company.trim())
                  return toast.error(sv ? "Företagsnamn krävs" : "Company name is required");
                if (!Number(price)) return toast.error(sv ? "Pris krävs" : "Price is required");
                generate.mutate();
              }}
            >
              <Download className="h-4 w-4" /> {sv ? "Exportera PDF" : "Export PDF"}
            </Button>
          </div>
        </section>

        {/* Live preview */}
        <section className="border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-display text-base font-medium tracking-tight">
              {sv ? "Förhandsvisning" : "Live preview"}
            </h2>
            <span className="microlabel text-[10px] text-muted-foreground">
              {sv ? "Uppdateras direkt" : "Updates as you type"}
            </span>
          </div>
          <div className="p-6">
            <div className="border bg-background px-7 py-8 shadow-[0_1px_0_var(--border)]">
              <div className="mb-6 flex items-start justify-between border-b pb-5">
                <div>
                  <div className="microlabel text-[9px] text-muted-foreground">
                    UU AI Society · Uppsala
                  </div>
                  <div className="mt-1.5 font-display text-xl font-medium tracking-tight">
                    {sv ? "Samarbetsvillkor" : "Partnership Terms"}
                  </div>
                </div>
                <Tri className="h-6 w-6 text-brand" />
              </div>
              <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-foreground/90">
                {preview || "—"}
              </pre>
            </div>
          </div>
        </section>
      </div>

      {/* History */}
      <section className="border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-display text-base font-medium tracking-tight">History</h2>
          <span className="microlabel tnum text-[10px] text-muted-foreground">
            {contracts.length}
          </span>
        </div>
        {contracts.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No contracts generated yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <Th>Company</Th>
                  <Th>Event type</Th>
                  <Th className="text-right">Price</Th>
                  <Th>Lang</Th>
                  <Th>Generated</Th>
                  <Th>By</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {contracts.map((c) => {
                  const by = c.generated_by ? profileMap.get(c.generated_by) : null;
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-accent/40">
                      <Td>
                        <span className="font-medium">{c.company_name}</span>
                      </Td>
                      <Td>
                        <span className="text-xs text-muted-foreground">{c.event_type}</span>
                      </Td>
                      <Td className="text-right">
                        <span className="font-mono text-xs tnum">{formatSEK(Number(c.price))}</span>
                      </Td>
                      <Td>
                        <span className="microlabel text-[10px] text-muted-foreground">
                          {c.language}
                        </span>
                      </Td>
                      <Td>
                        <span className="microlabel tnum text-[10px] text-muted-foreground">
                          {formatDate(c.date_generated)}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-muted-foreground">
                          {by ? (by.name || by.email).split(" ")[0] : "—"}
                        </span>
                      </Td>
                      <Td className="text-right">
                        <div className="inline-flex items-center gap-0.5">
                          <IconBtn title="View" onClick={() => setViewing(c)}>
                            <Eye className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn
                            title="Download PDF"
                            onClick={() =>
                              downloadContractPdf(c.content_snapshot || "", {
                                companyName: c.company_name,
                                eventType: c.event_type,
                                price: Number(c.price),
                                language: c.language,
                                generatedByName: by ? by.name || by.email : null,
                              })
                            }
                          >
                            <Download className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn
                            title="Delete"
                            danger
                            onClick={() =>
                              confirm(`Delete contract log for ${c.company_name}?`) &&
                              del.mutate(c.id)
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* View past contract */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-medium tracking-tight">
              {viewing?.company_name}
            </DialogTitle>
          </DialogHeader>
          <div className="microlabel tnum text-[10px] text-muted-foreground">
            {viewing?.event_type} · {viewing ? formatSEK(Number(viewing.price)) : ""} ·{" "}
            {formatDate(viewing?.date_generated)}
          </div>
          <pre className="whitespace-pre-wrap border bg-background p-4 font-sans text-[13px] leading-relaxed">
            {viewing?.content_snapshot || "No snapshot stored"}
          </pre>
        </DialogContent>
      </Dialog>

      <TemplateEditor open={templatesOpen} onOpenChange={setTemplatesOpen} templates={templates} />
    </div>
  );
}

function TemplateEditor({
  open,
  onOpenChange,
  templates,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  templates: any[];
}) {
  const qc = useQueryClient();
  const [lang, setLang] = useState<"en" | "sv">("en");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const t of templates) next[t.language] = t.template;
    setDrafts(next);
    const en = templates.find((t) => t.language === "en");
    const p = (en?.pricing ?? {}) as Record<string, number>;
    setPrices(Object.fromEntries(EVENT_TYPE_ORDER.map((t) => [t, String(p[t] ?? 0)])));
  }, [open, templates]);

  const save = useMutation({
    mutationFn: async () => {
      const pricing = Object.fromEntries(EVENT_TYPE_ORDER.map((t) => [t, Number(prices[t] || 0)]));
      for (const language of ["en", "sv"] as const) {
        const { error } = await supabase
          .from("contract_templates")
          .update({ template: drafts[language] ?? "", pricing })
          .eq("language", language);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractTemplates"] });
      toast.success("Templates updated");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-medium tracking-tight">
            Templates & pricing
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <Label className="microlabel text-muted-foreground">
              Standard pricing (SEK, shared by both languages)
            </Label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {EVENT_TYPE_ORDER.map((t) => (
                <div key={t} className="space-y-1">
                  <span className="microlabel block text-[9.5px] text-muted-foreground/80">
                    {t}
                  </span>
                  <Input
                    type="number"
                    min="0"
                    value={prices[t] ?? ""}
                    onChange={(e) => setPrices({ ...prices, [t]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="microlabel text-muted-foreground">Letter template</Label>
              <div className="inline-flex border p-0.5">
                {(["en", "sv"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`microlabel px-2.5 py-1 text-[10px] transition-colors ${
                      lang === l
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              rows={14}
              value={drafts[lang] ?? ""}
              onChange={(e) => setDrafts({ ...drafts, [lang]: e.target.value })}
              className="font-mono text-xs leading-relaxed"
            />
            <p className="microlabel mt-1.5 text-[9.5px] text-muted-foreground/70">
              Placeholders: {"{name}"} {"{pricing}"} {"{custom_terms}"} {"{signatory}"}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save templates"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="microlabel text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function IconBtn({
  title,
  danger,
  onClick,
  children,
}: {
  title: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-[3px] p-1.5 transition-colors ${danger ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
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
