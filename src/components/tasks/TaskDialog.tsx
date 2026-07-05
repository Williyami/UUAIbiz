import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { profilesQuery, companiesQuery, eventsQuery, currentUserQuery } from "@/lib/queries";
import { toast } from "sonner";
import { TASK_STATUS_ORDER, TASK_PRIORITY_ORDER } from "./taskStyles";
import { Trash2 } from "lucide-react";

type Task = any;

export function TaskDialog({
  open,
  onOpenChange,
  task,
  canEdit = true,
  defaultPersonal = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task?: Task | null;
  canEdit?: boolean;
  defaultPersonal?: boolean;
}) {
  const qc = useQueryClient();
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const { data: companies } = useSuspenseQuery(companiesQuery);
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    setForm(
      task ?? {
        title: "",
        description: "",
        related_company_id: null,
        related_event_id: null,
        assigned_to: defaultPersonal ? (me?.id ?? null) : null,
        due_date: null,
        status: "To do",
        priority: "Medium",
        personal: defaultPersonal,
      },
    );
  }, [task, open, defaultPersonal, me?.id]);

  const save = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        ...values,
        due_date: values.due_date || null,
        // personal tasks always belong to the current user
        assigned_to: values.personal ? (me?.id ?? null) : values.assigned_to || null,
        related_company_id: values.related_company_id || null,
        related_event_id: values.related_event_id || null,
        personal: !!values.personal,
      };
      if (task?.id) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", task.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(task ? "Task updated" : "Task added");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.title?.trim()) return toast.error("Title is required");
            save.mutate(form);
          }}
        >
          <fieldset disabled={!canEdit} className="contents">
          <label className="flex w-fit cursor-pointer items-center gap-2 border px-3 py-2">
            <Checkbox
              checked={!!form.personal}
              onCheckedChange={(v) =>
                setForm({ ...form, personal: !!v, assigned_to: v ? (me?.id ?? null) : form.assigned_to })
              }
            />
            <span className="microlabel text-muted-foreground">
              Personal task — only visible to you
            </span>
          </label>
          <Field label="Title">
            <Input
              value={form.title || ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={3}
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITY_ORDER.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {!form.personal && (
              <Field label="Assigned to">
                <Select
                  value={form.assigned_to || "none"}
                  onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name || p.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Due date">
              <Input
                type="date"
                value={form.due_date || ""}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </Field>
            <Field label="Related company">
              <Select
                value={form.related_company_id || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, related_company_id: v === "none" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {companies.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Related event">
              <Select
                value={form.related_event_id || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, related_event_id: v === "none" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {events.map((ev: any) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          </fieldset>
          <DialogFooter className="sm:justify-between">
            {canEdit && task?.id ? (
              <Button
                type="button"
                variant="ghost"
                className="text-[color:var(--brand-red)] hover:text-[color:var(--brand-red)]"
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {canEdit ? "Cancel" : "Close"}
              </Button>
              {canEdit && (
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
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
