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
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Checkbox } from "@/components/ui/checkbox";
import { AssigneePicker } from "@/components/shared/AssigneePicker";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { profilesQuery, companiesQuery } from "@/lib/queries";
import { normalizeTimeInput } from "@/lib/format";
import { normalizeMeetingLink } from "@/lib/meeting-link";
import {
  mondayOf,
  nextMonday,
  POLL_DAY_END,
  POLL_DAY_START,
  POLL_DURATION,
} from "@/lib/availability";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { deleteWithUndo } from "@/lib/undo";

type Meeting = any;

export function MeetingDialog({
  open,
  onOpenChange,
  meeting,
  onPollOpened,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  meeting?: Meeting | null;
  /** Called with the saved meeting when it now has an open "Find a time" poll. */
  onPollOpened?: (meeting: Meeting) => void;
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

  const findTime = !!form.poll_week_start;

  const save = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        title: values.title,
        internal: !!values.internal,
        company_id: values.internal ? null : values.company_id || null,
        // An open poll leaves the time unset until it is booked.
        meeting_date: values.poll_week_start ? null : values.meeting_date || null,
        meeting_time: values.poll_week_start ? null : values.meeting_time || null,
        notes: values.notes || null,
        assignees: values.assignees ?? [],
        // Sent only when there is something to store (or to clear), so saving
        // a meeting without a link never depends on the column existing.
        ...(values.meeting_link || meeting?.meeting_link
          ? { meeting_link: values.meeting_link || null }
          : {}),
        // Poll fields likewise only when a poll is being opened or closed.
        ...(values.poll_week_start
          ? {
              poll_week_start: mondayOf(values.poll_week_start),
              poll_days: Number(values.poll_days ?? 5),
              poll_day_start: POLL_DAY_START,
              poll_day_end: POLL_DAY_END,
              duration_minutes: POLL_DURATION,
            }
          : meeting?.poll_week_start
            ? { poll_week_start: null }
            : {}),
      };
      if (meeting?.id) {
        const { data, error } = await supabase
          .from("meetings")
          .update(payload)
          .eq("id", meeting.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("meetings").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (saved: any) => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      const pollNew = saved?.poll_week_start && saved.poll_week_start !== meeting?.poll_week_start;
      toast.success(
        pollNew
          ? "Poll opened. Everyone assigned has been asked to pick their times."
          : meeting
            ? "Meeting updated"
            : "Meeting added",
      );
      onOpenChange(false);
      if (saved?.poll_week_start) onPollOpened?.(saved);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    // Deleted after a few seconds unless someone presses Undo.
    mutationFn: async () =>
      deleteWithUndo({
        qc,
        queryKey: ["meetings"],
        id: meeting.id,
        message: `Deleted "${meeting.title}"`,
        run: async () => {
          const { error } = await supabase.from("meetings").delete().eq("id", meeting.id);
          if (error) throw error;
        },
      }),
    onSuccess: () => {
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
          // Native validation is off: a half-typed date reports an empty
          // value and blocks submit, which reads as "a date is required" even
          // though the field is optional. The required field is checked below.
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.title?.trim()) return toast.error("Title is required");
            if (findTime && !(form.assignees ?? []).length)
              return toast.error("Assign the people who should pick their times");
            const meeting_time = normalizeTimeInput(form.meeting_time || "");
            if (meeting_time === null) return toast.error("Time must be HH:mm, e.g. 16:30");
            const meeting_link = normalizeMeetingLink(form.meeting_link);
            if (meeting_link === null)
              return toast.error(
                "Meeting link must be a web address, e.g. meet.google.com/abc-defg-hij",
              );
            save.mutate({ ...form, meeting_time, meeting_link });
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
              onCheckedChange={(v) =>
                setForm({ ...form, internal: !!v, company_id: v ? null : form.company_id })
              }
            />
            <span className="microlabel text-[10px] text-muted-foreground">
              Internal meeting (no company)
            </span>
          </label>
          <label className="flex w-fit cursor-pointer items-center gap-2 py-0.5">
            <Checkbox
              checked={findTime}
              onCheckedChange={(v) =>
                setForm({
                  ...form,
                  poll_week_start: v ? (meeting?.poll_week_start ?? nextMonday()) : null,
                })
              }
            />
            <span className="microlabel text-[10px] text-muted-foreground">
              Find a time with the team (everyone assigned picks their availability)
            </span>
          </label>
          {findTime && (
            <div className="grid grid-cols-2 gap-3 border bg-muted/30 p-3">
              <Field label="Week of">
                <Input
                  type="date"
                  value={form.poll_week_start || ""}
                  onChange={(e) =>
                    setForm({ ...form, poll_week_start: e.target.value || nextMonday() })
                  }
                />
              </Field>
              <Field label="Days">
                <PollSelect
                  value={String(form.poll_days ?? 5)}
                  onChange={(v) => setForm({ ...form, poll_days: Number(v) })}
                  options={[
                    ["5", "Mon–Fri"],
                    ["7", "Mon–Sun"],
                  ]}
                />
              </Field>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {!form.internal && (
              <Field label="Company (optional)">
                <SearchableSelect
                  value={form.company_id}
                  onChange={(v) => setForm({ ...form, company_id: v })}
                  options={companies.map((c: any) => ({
                    value: c.id,
                    label: c.name,
                    keywords: c.contact_person ?? "",
                    hint: c.status,
                  }))}
                  searchPlaceholder="Search companies…"
                />
              </Field>
            )}
            {!findTime && (
              <Field label="Date">
                <Input
                  type="date"
                  value={form.meeting_date || ""}
                  onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
                />
              </Field>
            )}
            {!findTime && (
              <Field label="Time (optional)">
                <Input
                  inputMode="numeric"
                  placeholder="16:30"
                  maxLength={5}
                  value={(form.meeting_time || "").slice(0, 5)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      meeting_time: e.target.value.replace(/[^\d:.]/g, "").slice(0, 5),
                    })
                  }
                  onBlur={(e) => {
                    const t = normalizeTimeInput(e.target.value);
                    if (t) setForm({ ...form, meeting_time: t });
                  }}
                />
              </Field>
            )}
            <Field label="Assigned to">
              <AssigneePicker
                value={form.assignees ?? []}
                onChange={(ids) => setForm({ ...form, assignees: ids })}
                profiles={profiles}
              />
            </Field>
          </div>
          <Field label="Meeting link (optional)">
            <div className="flex gap-2">
              <Input
                type="url"
                inputMode="url"
                placeholder="Zoom, Google Meet or Teams link"
                value={form.meeting_link || ""}
                onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
                onBlur={(e) => {
                  const link = normalizeMeetingLink(e.target.value);
                  if (link) setForm({ ...form, meeting_link: link });
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                title="Open link in a new tab"
                disabled={!normalizeMeetingLink(form.meeting_link)}
                onClick={() => {
                  const link = normalizeMeetingLink(form.meeting_link);
                  if (link) window.open(link, "_blank", "noopener,noreferrer");
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </Field>
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
                onClick={() => remove.mutate()}
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

function PollSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
