import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { infoSectionsQuery, currentUserQuery } from "@/lib/queries";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHeader } from "@/components/shared/PageHeader";
import { Markdown } from "@/lib/markdown";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/info")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(infoSectionsQuery);
  },
  component: InfoPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

function InfoPage() {
  const qc = useQueryClient();
  const { data: sections } = useSuspenseQuery(infoSectionsQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("info_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["infoSections"] });
      toast.success("Section deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: async ({ id, dir }: { id: string; dir: -1 | 1 }) => {
      const idx = sections.findIndex((s) => s.id === id);
      const other = sections[idx + dir];
      if (!other) return;
      const a = sections[idx];
      // swap sort_order values; fall back to index-based orders if equal
      const aOrder = a.sort_order === other.sort_order ? idx : a.sort_order;
      const bOrder = a.sort_order === other.sort_order ? idx + dir : other.sort_order;
      const r1 = await supabase.from("info_sections").update({ sort_order: bOrder }).eq("id", a.id);
      if (r1.error) throw r1.error;
      const r2 = await supabase
        .from("info_sections")
        .update({ sort_order: aOrder })
        .eq("id", other.id);
      if (r2.error) throw r2.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["infoSections"] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <PageHeader
        title="Info & Resources"
        lede="Terms, pricing, checklists and lessons learned — the team's living reference."
      >
        {me?.isAdmin && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add section
          </Button>
        )}
      </PageHeader>

      {sections.length === 0 ? (
        <div className="border border-dashed bg-card/50 px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing here yet.{" "}
            {me?.isAdmin
              ? "Add the first section — partnership terms and the event checklist are good starters."
              : "An admin can add reference sections here."}
          </p>
        </div>
      ) : (
        <Accordion type="multiple" className="border bg-card">
          {sections.map((s, i) => (
            <AccordionItem key={s.id} value={s.id} className="border-b px-5 last:border-b-0">
              <AccordionTrigger className="py-4 hover:no-underline">
                <span className="flex items-baseline gap-3 text-left">
                  <span className="microlabel tnum text-[10px] text-muted-foreground/60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-base font-medium tracking-tight">
                    {s.title}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-5">
                <div className="pl-8">
                  <Markdown text={s.body} />
                  {me?.isAdmin && (
                    <div className="mt-5 flex items-center gap-1 border-t pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-muted-foreground"
                        onClick={() => {
                          setEditing(s);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        disabled={i === 0}
                        onClick={() => reorder.mutate({ id: s.id, dir: -1 })}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        disabled={i === sections.length - 1}
                        onClick={() => reorder.mutate({ id: s.id, dir: 1 })}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-7 text-destructive hover:text-destructive"
                        onClick={() => confirm(`Delete "${s.title}"?`) && del.mutate(s.id)}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <SectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        section={editing}
        nextOrder={sections.length}
      />
    </div>
  );
}

function SectionDialog({
  open,
  onOpenChange,
  section,
  nextOrder,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  section?: any | null;
  nextOrder: number;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // sync fields when the dialog opens for a different section
  const [seenKey, setSeenKey] = useState<string | null>(null);
  const openKey = open ? (section?.id ?? "new") : null;
  if (openKey !== seenKey) {
    setSeenKey(openKey);
    if (openKey) {
      setTitle(section?.title ?? "");
      setBody(section?.body ?? "");
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      if (section?.id) {
        const { error } = await supabase
          .from("info_sections")
          .update({ title, body })
          .eq("id", section.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("info_sections")
          .insert({ title, body, sort_order: nextOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["infoSections"] });
      toast.success(section ? "Section updated" : "Section added");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-medium tracking-tight">
            {section ? "Edit section" : "New section"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return toast.error("Title is required");
            save.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label className="microlabel text-muted-foreground">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="microlabel text-muted-foreground">Body</Label>
            <Textarea
              rows={14}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="font-mono text-xs leading-relaxed"
            />
            <p className="microlabel text-[9.5px] text-muted-foreground/70">
              Supports markdown basics: ## headings, - lists, **bold**, [links](https://…)
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
