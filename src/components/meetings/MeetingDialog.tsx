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
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { AssigneePicker } from "@/components/shared/AssigneePicker";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { profilesQuery, companiesQuery } from "@/lib/queries";
import { toast } from "sonner";

type Meeting = any;

export function MeetingDialog({
  open,
  onOpenChange,
  meeting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  meeting?: Meeting | null;
}) {
  const qc = useQueryClient();
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const { data: companies } = useSuspenseQuery(companiesQuery);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    setForm(
      meeting ?? {
        title: "",
        company_id: null,
        internal: false,
        meeting_date: new Date().toLocaleDateString("sv-SE"),
        meeting_time: "",
        notes: "",
        assignees: [],
      },
    );
  }, [meeting, open]);

  const save = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        title: values.title,
        internal: !!values.internal,
        company_id: values.internal ? null : values.company_id || null,
        meeting_date: values.meeting_date || null,
        meeting_time: values.meeting_time || null,
        notes: values.notes || null,
        assignees: values.assignees ?? [],
      };
      if (meeting?.id) {
        const { error } = await supabase.from("meetings").update(payload).eq("id", meeting.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("meetings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      toast.success(meeting ? "Meeting updated" : "Meeting added");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("meetings").delete().eq("id", meeting.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting deleted");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{meeting ? "Edit meeting" : "Add meeting"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.title?.trim()) return toast.error("Title is required");
            save.mutate(form);
          }}
        >
          <Field label="Title">
            <Input
              value={form.title || ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </Field>
          <label className="flex w-fit cursor-pointer items-center gap-2 py-0.5">
            <Checkbox
              checked={!!form.internal}
              onCheckedChange={(v) => setForm({ ...form, internal: !!v, company_id: v ? null : form.company_id })}
            />
            <span className="microlabel text-[10px] text-muted-foreground">
              Internal meeting (no company)
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {!form.internal && (
              <Field label="Company (optional)">
                <Select
                  value={form.company_id || "none"}
                  onValueChange={(v) => setForm({ ...form, company_id: v === "none" ? null : v })}
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
            )}
            <Field label="Date">
              <Input
                type="date"
                value={form.meeting_date || ""}
                onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
              />
            </Field>
            <Field label="Time (optional)">
              <Input
                type="time"
                value={(form.meeting_time || "").slice(0, 5)}
                onChange={(e) => setForm({ ...form, meeting_time: e.target.value })}
              />
            </Field>
            <Field label="Assigned to">
              <AssigneePicker
                value={form.assignees ?? []}
                onChange={(ids) => setForm({ ...form, assignees: ids })}
                profiles={profiles}
              />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              rows={4}
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <DialogFooter>
            {meeting?.id && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-destructive hover:text-destructive"
                disabled={remove.isPending}
                onClick={() => confirm("Delete this meeting?") && remove.mutate()}
              >
                Delete
              </Button>
            )}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="microlabel text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
