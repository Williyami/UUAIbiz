import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { currentUserQuery, meetingAvailabilityQuery, profilesQuery } from "@/lib/queries";
import {
  bestFits,
  buildDays,
  formatSlot,
  POLL_DAY_END,
  POLL_DAY_START,
  POLL_DURATION,
  rankStarts,
  slotDate,
  slotTime,
  SLOT_MINUTES,
  type PollShape,
} from "@/lib/availability";
import { avatarColor } from "@/lib/avatar";
import { initials } from "@/lib/format";
import { playSound } from "@/lib/sounds";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

/**
 * When2Meet-style poll for one meeting: each invited person paints the half
 * hours they can make, everyone sees the overlap, and an editor books the
 * best fit or any start they pick.
 */
export function AvailabilityDialog({
  meeting,
  onOpenChange,
  canBook,
  onEdit,
}: {
  meeting: any | null;
  onOpenChange: (open: boolean) => void;
  canBook: boolean;
  /** Opens the meeting form, to change the poll's week or hours, or close it. */
  onEdit?: (meeting: any) => void;
}) {
  return (
    <Dialog open={!!meeting} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
        {meeting && (
          <PollBody
            meeting={meeting}
            canBook={canBook}
            onDone={() => onOpenChange(false)}
            onEdit={onEdit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PollBody({
  meeting,
  canBook,
  onDone,
  onEdit,
}: {
  meeting: any;
  canBook: boolean;
  onDone: () => void;
  onEdit?: (meeting: any) => void;
}) {
  const qc = useQueryClient();
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);
  const { data: rows = [], isLoading } = useQuery({
    ...meetingAvailabilityQuery(meeting.id),
    // Live enough for a team filling it in at the same time.
    refetchInterval: 5000,
  });

  const poll: PollShape = {
    poll_week_start: meeting.poll_week_start,
    poll_days: meeting.poll_days ?? 5,
    // Fixed for every poll, older ones included, whatever they stored.
    poll_day_start: POLL_DAY_START,
    poll_day_end: POLL_DAY_END,
    duration_minutes: POLL_DURATION,
  };
  const days = useMemo(() => buildDays(poll), [JSON.stringify(poll)]); // eslint-disable-line react-hooks/exhaustive-deps
  const allSlots = useMemo(() => new Set(days.flatMap((d) => d.slots)), [days]);
  const invited: string[] = meeting.assignees ?? [];
  const isInvited = !!me?.id && invited.includes(me.id);
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const nameOf = (id: string) => {
    const p = profileMap.get(id);
    return (p?.name || p?.email || "Former member").split(" ")[0];
  };

  // My answers live locally while painting and are saved shortly after.
  const [mine, setMine] = useState<Set<string>>(new Set());
  const loadedMine = useRef(false);
  useEffect(() => {
    if (loadedMine.current || isLoading) return;
    const row = rows.find((r) => r.user_id === me?.id);
    setMine(new Set((row?.slots ?? []).filter((s) => allSlots.has(s))));
    loadedMine.current = true;
  }, [rows, isLoading, me?.id, allSlots]);

  const save = useMutation({
    mutationFn: async (slots: string[]) => {
      const { error } = await supabase
        .from("meeting_availability")
        .upsert(
          { meeting_id: meeting.id, user_id: me!.id, slots },
          { onConflict: "meeting_id,user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetingAvailability", meeting.id] }),
    onError: (e: any) => toast.error(e.message),
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleSave(next: Set<string>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save.mutate([...next].sort()), 500);
  }
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  // Everyone's answers, with mine taken from the live local copy.
  const slotsByUser = new Map<string, Set<string>>();
  for (const r of rows) slotsByUser.set(r.user_id, new Set(r.slots));
  if (isInvited && loadedMine.current) slotsByUser.set(me!.id, mine);
  const responded = invited.filter((id) => (slotsByUser.get(id)?.size ?? 0) > 0);

  const best = bestFits(poll, invited, slotsByUser);
  const ranked = useMemo(
    () => new Map(rankStarts(poll, invited, slotsByUser).map((c) => [c.start, c])),
    // Recomputed whenever answers change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, mine, JSON.stringify(poll), invited.join()],
  );

  const [hover, setHover] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const book = useMutation({
    mutationFn: async (start: string) => {
      const { error } = await supabase
        .from("meetings")
        .update({
          meeting_date: slotDate(start),
          meeting_time: slotTime(start),
          poll_week_start: null,
        })
        .eq("id", meeting.id);
      if (error) throw error;
    },
    onSuccess: (_d, start) => {
      playSound("success");
      toast.success(`Booked for ${formatSlot(start)}`);
      qc.invalidateQueries({ queryKey: ["meetings"] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const endOf = (start: string) => {
    const d = new Date(start);
    d.setMinutes(d.getMinutes() + poll.duration_minutes);
    return d.toTimeString().slice(0, 5);
  };
  const focus = hover ?? picked;
  const focusFree = focus ? invited.filter((id) => slotsByUser.get(id)?.has(focus)) : [];

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-xl font-medium tracking-tight">
          Find a time: {meeting.title}
        </DialogTitle>
        <p className="text-sm text-muted-foreground">
          Week of {formatSlot(`${poll.poll_week_start}T00:00`).split(",")[0]} ·{" "}
          {poll.duration_minutes} min meeting · {responded.length} of {invited.length} have answered
        </p>
        {canBook && onEdit && (
          <button
            className="microlabel w-fit text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
            onClick={() => {
              onDone();
              onEdit(meeting);
            }}
          >
            Edit meeting or change the week
          </button>
        )}
      </DialogHeader>

      {invited.length === 0 ? (
        <p className="border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Nobody is assigned to this meeting yet. Edit the meeting and assign the people who should
          answer.
        </p>
      ) : (
        <div className="space-y-5">
          {/* Who's answered */}
          <div className="flex flex-wrap gap-2">
            {invited.map((id) => {
              const done = responded.includes(id);
              const p = profileMap.get(id);
              return (
                <span
                  key={id}
                  className={`inline-flex items-center gap-1.5 border px-2 py-1 text-xs ${done ? "" : "text-muted-foreground"}`}
                >
                  {p?.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="size-4 rounded-full object-cover" />
                  ) : (
                    <span
                      className="flex size-4 items-center justify-center rounded-full text-[8px] font-semibold"
                      style={avatarColor(id)}
                    >
                      {initials(p?.name || p?.email)}
                    </span>
                  )}
                  {nameOf(id)}
                  {id === me?.id && " (you)"}
                  {done ? (
                    <Check className="h-3 w-3 text-(--status-success)" />
                  ) : (
                    <span className="text-[10px]">waiting</span>
                  )}
                </span>
              );
            })}
          </div>

          <div className={`grid grid-cols-1 gap-6 ${isInvited ? "lg:grid-cols-2" : ""}`}>
            {isInvited && (
              <div>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">Your availability</h3>
                  <span className="microlabel flex items-center gap-1 text-[10px] text-muted-foreground">
                    {save.isPending ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" /> Saving
                      </>
                    ) : (
                      "Click and drag to mark when you're free"
                    )}
                  </span>
                </div>
                <PaintGrid
                  days={days}
                  disabled={isLoading}
                  isOn={(s) => mine.has(s)}
                  onPaint={(slotsToSet, on) => {
                    setMine((prev) => {
                      const next = new Set(prev);
                      for (const s of slotsToSet) {
                        if (on) next.add(s);
                        else next.delete(s);
                      }
                      scheduleSave(next);
                      return next;
                    });
                  }}
                />
              </div>
            )}

            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">Everyone</h3>
                <Legend total={invited.length} />
              </div>
              <GroupGrid
                days={days}
                total={invited.length}
                countAt={(s) => invited.filter((id) => slotsByUser.get(id)?.has(s)).length}
                picked={picked}
                durationSlots={Math.ceil(poll.duration_minutes / SLOT_MINUTES)}
                onHover={setHover}
                onPick={canBook ? setPicked : undefined}
              />
              <div className="mt-2 min-h-10 text-xs text-muted-foreground">
                {focus ? (
                  <>
                    <span className="font-medium text-foreground">{formatSlot(focus)}</span>:{" "}
                    {focusFree.length
                      ? `${focusFree.map(nameOf).join(", ")} free`
                      : "nobody free yet"}
                    {invited.length > focusFree.length &&
                      focusFree.length > 0 &&
                      ` · not ${invited
                        .filter((id) => !focusFree.includes(id))
                        .map(nameOf)
                        .join(", ")}`}
                  </>
                ) : (
                  "Hover a slot to see who's free."
                )}
              </div>
            </div>
          </div>

          {/* Booking */}
          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-semibold">Best times</h3>
            {best.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No overlap yet. Best times appear here as people mark when they're free.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {best.map((c, i) => (
                  <li key={c.start} className="flex flex-col gap-2 border px-3 py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">
                        {formatSlot(c.start)}–{endOf(c.start)}
                      </span>
                      {i === 0 && (
                        <span className="microlabel text-[9px] text-(--brand-red)">Best fit</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {c.available.length} of {invited.length} can make it
                      {c.available.length < invited.length &&
                        ` · not ${invited
                          .filter((id) => !c.available.includes(id))
                          .map(nameOf)
                          .join(", ")}`}
                    </span>
                    {canBook && (
                      <Button
                        size="sm"
                        variant={i === 0 ? "default" : "outline"}
                        disabled={book.isPending}
                        onClick={() => book.mutate(c.start)}
                      >
                        Book this time
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canBook && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {picked ? (
                  <>
                    <span>
                      Your pick: <b>{formatSlot(picked)}</b>–{endOf(picked)} ·{" "}
                      {ranked.get(picked)?.available.length ?? 0} of {invited.length} can make the
                      whole meeting
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={book.isPending}
                      onClick={() => book.mutate(picked)}
                    >
                      Book {slotTime(picked)}
                    </Button>
                    <button
                      className="text-xs text-muted-foreground underline underline-offset-2"
                      onClick={() => setPicked(null)}
                    >
                      Clear
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Or click any start time in the Everyone grid to book it yourself.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function TimeGutter({ days }: { days: { slots: string[] }[] }) {
  return (
    <div className="pt-6">
      {days[0]?.slots.map((s) => (
        <div key={s} className="relative h-4 pr-1.5 text-right">
          {s.endsWith(":00") && (
            <span className="tnum absolute -top-1.5 right-1.5 text-[9.5px] text-muted-foreground">
              {slotTime(s)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function DayHeader({ label }: { label: string }) {
  return (
    <div className="h-6 truncate text-center text-[10.5px] font-medium text-muted-foreground">
      {label}
    </div>
  );
}

/** My grid: press, then drag across slots to mark them free (or clear them). */
function PaintGrid({
  days,
  disabled,
  isOn,
  onPaint,
}: {
  days: { date: string; label: string; slots: string[] }[];
  disabled: boolean;
  isOn: (slot: string) => boolean;
  onPaint: (slots: string[], on: boolean) => void;
}) {
  const drag = useRef<{ mode: boolean; done: Set<string> } | null>(null);

  function slotAt(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    return el?.closest<HTMLElement>("[data-slot]")?.dataset.slot ?? null;
  }
  function apply(slot: string | null) {
    if (!slot || !drag.current || drag.current.done.has(slot)) return;
    drag.current.done.add(slot);
    onPaint([slot], drag.current.mode);
  }

  return (
    <div className="flex select-none">
      <TimeGutter days={days} />
      <div
        className={`grid flex-1 gap-px touch-none ${disabled ? "pointer-events-none opacity-50" : ""}`}
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
        onPointerDown={(e) => {
          const slot = slotAt(e.clientX, e.clientY);
          if (!slot) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { mode: !isOn(slot), done: new Set() };
          apply(slot);
        }}
        onPointerMove={(e) => drag.current && apply(slotAt(e.clientX, e.clientY))}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {days.map((day) => (
          <div key={day.date}>
            <DayHeader label={day.label} />
            <div className="border">
              {day.slots.map((s) => (
                <div
                  key={s}
                  data-slot={s}
                  className={`h-4 cursor-pointer ${s.endsWith(":00") ? "border-t border-border/70 first:border-t-0" : ""} ${
                    isOn(s) ? "bg-(--status-success)" : "bg-card hover:bg-accent"
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Everyone's overlap as a heatmap; darker = more people free. */
function GroupGrid({
  days,
  total,
  countAt,
  picked,
  durationSlots,
  onHover,
  onPick,
}: {
  days: { date: string; label: string; slots: string[] }[];
  total: number;
  countAt: (slot: string) => number;
  picked: string | null;
  durationSlots: number;
  onHover: (slot: string | null) => void;
  onPick?: (slot: string) => void;
}) {
  // The picked meeting's whole span, outlined on the grid
  const pickedSpan = new Set<string>();
  if (picked) {
    for (const day of days) {
      const i = day.slots.indexOf(picked);
      if (i >= 0) day.slots.slice(i, i + durationSlots).forEach((s) => pickedSpan.add(s));
    }
  }
  return (
    <div className="flex select-none" onPointerLeave={() => onHover(null)}>
      <TimeGutter days={days} />
      <div
        className="grid flex-1 gap-px"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((day) => (
          <div key={day.date}>
            <DayHeader label={day.label} />
            <div className="border">
              {day.slots.map((s) => {
                const n = countAt(s);
                const share = total ? n / total : 0;
                return (
                  <button
                    key={s}
                    type="button"
                    tabIndex={-1}
                    aria-label={`${s}: ${n} of ${total} free`}
                    onPointerEnter={() => onHover(s)}
                    onClick={() => onPick?.(s)}
                    className={`block h-4 w-full ${s.endsWith(":00") ? "border-t border-border/70 first:border-t-0" : ""} ${
                      onPick ? "cursor-pointer" : "cursor-default"
                    } ${pickedSpan.has(s) ? "outline-2 -outline-offset-2 outline-(--brand-red)" : ""}`}
                    style={{
                      backgroundColor: n
                        ? `color-mix(in oklch, var(--status-success) ${Math.round(15 + share * 85)}%, var(--card))`
                        : "var(--card)",
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend({ total }: { total: number }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      0
      {[0.25, 0.5, 0.75, 1].map((share) => (
        <span
          key={share}
          className="size-3 border"
          style={{
            backgroundColor: `color-mix(in oklch, var(--status-success) ${Math.round(15 + share * 85)}%, var(--card))`,
          }}
        />
      ))}
      {total} free
    </span>
  );
}
