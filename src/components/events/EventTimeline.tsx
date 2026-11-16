import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { eventStatusColor, semesterBounds, type EventStatus } from "./eventStyles";
import { parseLocalDate } from "@/lib/format";

/*
 * A semester at a glance: one horizontal line from the first to the last day
 * of the term, month ticks underneath, a "today" marker, and every dated event
 * as a dot in its status colour. Labels sit on lanes above and below the line,
 * placed so they never overlap; each opens its event.
 */

const DAY = 86_400_000;
const LANE = 44; // px between label rows
const GAP = 10; // px kept free between neighbouring labels
const LANE_ORDER = [-1, 1, -2, 2, -3, 3]; // above/below the line, nearest first
const MIN_WIDTH = 760; // below this the strip scrolls sideways

type Placed = {
  e: any;
  x: number; // px from the left of the track
  lane: number; // negative = above the line
  width: number; // px reserved for its label
};

function labelWidth(title: string) {
  // Roughly the rendered width at text-xs, capped so long titles truncate.
  return Math.min(170, Math.max(88, title.length * 6.2 + 20));
}

export function EventTimeline({ events, companies }: { events: any[]; companies: any[] }) {
  const navigate = useNavigate();
  const [shift, setShift] = useState(0); // semesters away from the current one
  const scroller = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const sem = useMemo(() => {
    const now = new Date();
    // Step half a year per semester, landing safely inside the target term.
    return semesterBounds(new Date(now.getFullYear(), now.getMonth() + shift * 6, 15));
  }, [shift]);
  const start = sem.start.getTime();
  const span = sem.end.getTime() - start;
  const today = new Date(new Date().toDateString()).getTime();
  const todayIn = today >= start && today <= sem.end.getTime();

  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // On narrow screens, start scrolled so today is in view.
  useLayoutEffect(() => {
    const sc = scroller.current;
    if (!sc || !width || !todayIn) return;
    sc.scrollLeft = Math.max(0, ((today - start) / span) * width - sc.clientWidth / 2);
  }, [width, todayIn, today, start, span]);

  const companyName = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);

  const inTerm = events
    .filter((e) => e.date)
    .map((e) => ({ e, t: parseLocalDate(e.date).getTime() }))
    .filter(({ t }) => t >= start && t <= sem.end.getTime())
    .sort((a, b) => a.t - b.t);

  const nextId = inTerm.find(
    ({ e, t }) => t >= today && e.status !== "Cancelled" && e.status !== "Idea",
  )?.e.id;

  // Greedy lane placement: each label takes the nearest lane where it fits.
  const placed: Placed[] = [];
  const laneEnd = new Map<number, number>();
  if (width) {
    for (const { e, t } of inTerm) {
      const x = ((t - start) / span) * width;
      const w = labelWidth(e.title ?? "");
      const left = Math.min(Math.max(x - w / 2, 0), width - w);
      const lane =
        LANE_ORDER.find((l) => (laneEnd.get(l) ?? -Infinity) + GAP <= left) ??
        // Everything's full: reuse the lane that frees up first.
        [...LANE_ORDER].sort((a, b) => (laneEnd.get(a) ?? 0) - (laneEnd.get(b) ?? 0))[0];
      laneEnd.set(lane, left + w);
      placed.push({ e, x, lane, width: w });
    }
  }
  const above = Math.max(1, ...placed.map((p) => (p.lane < 0 ? -p.lane : 0)));
  const below = Math.max(1, ...placed.map((p) => (p.lane > 0 ? p.lane : 0)));
  const axisY = above * LANE + 8;
  const height = axisY + below * LANE + 34; // room for the month row

  const months: { label: string; x: number }[] = [];
  for (let d = new Date(sem.start); d <= sem.end; d.setMonth(d.getMonth() + 1)) {
    months.push({
      label: d.toLocaleDateString("en-GB", { month: "short" }),
      x: width ? ((d.getTime() - start) / span) * width : 0,
    });
  }

  const upcoming = inTerm.filter(({ t, e }) => t >= today && e.status !== "Cancelled").length;

  return (
    <section className="border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-base font-medium tracking-tight">{sem.label}</h2>
          <span className="microlabel tnum text-[10px] text-muted-foreground">
            {inTerm.length} {inTerm.length === 1 ? "event" : "events"}
            {todayIn && ` · ${upcoming} to come`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {shift !== 0 && (
            <button
              onClick={() => setShift(0)}
              className="microlabel rounded-[3px] px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              This term
            </button>
          )}
          <button
            title="Previous term"
            onClick={() => setShift((s) => s - 1)}
            className="rounded-[3px] p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            title="Next term"
            onClick={() => setShift((s) => s + 1)}
            className="rounded-[3px] p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scroller} className="overflow-x-auto px-6 py-3">
        <div ref={track} className="relative" style={{ minWidth: MIN_WIDTH, height }}>
          {/* The line, faint for the past and solid from today on */}
          <div className="absolute inset-x-0 h-px bg-border" style={{ top: axisY }} />
          {todayIn && width > 0 && (
            <div
              className="absolute right-0 h-[2px] bg-foreground/25"
              style={{ top: axisY - 0.5, left: ((today - start) / span) * width }}
            />
          )}

          {/* Month ticks */}
          {months.map((m) => (
            <div key={m.label}>
              <div className="absolute h-2 w-px bg-border" style={{ left: m.x, top: axisY - 4 }} />
              <span
                className="microlabel absolute whitespace-nowrap text-[9.5px] text-muted-foreground"
                style={{ left: m.x, top: height - 16 }}
              >
                {m.label}
              </span>
            </div>
          ))}

          {/* Today */}
          {todayIn && width > 0 && (
            <div
              className="pointer-events-none absolute top-0 w-px border-l border-dashed border-(--brand-red)/60"
              style={{ left: ((today - start) / span) * width, height: axisY + 6 }}
            >
              <span className="microlabel absolute -top-0.5 left-1.5 whitespace-nowrap text-[9px] text-(--brand-red)">
                Today
              </span>
            </div>
          )}

          {placed.map(({ e, x, lane, width: w }) => {
            const past = parseLocalDate(e.date).getTime() < today;
            const cancelled = e.status === "Cancelled";
            const next = e.id === nextId;
            const color = eventStatusColor[e.status as EventStatus] ?? "var(--muted-foreground)";
            const left = Math.min(Math.max(x - w / 2, 0), width - w);
            const labelTop = lane < 0 ? axisY + lane * LANE - 2 : axisY + (lane - 1) * LANE + 12;
            const company =
              (e.company_ids?.[0] && companyName.get(e.company_ids[0])) || e.company?.name || null;
            return (
              <div key={e.id} className={past || cancelled ? "opacity-55" : ""}>
                {/* Stem from the dot to its label */}
                <div
                  className="absolute z-0 w-px bg-border"
                  style={
                    lane < 0
                      ? { left: x, top: labelTop + 32, height: axisY - labelTop - 32 }
                      : { left: x, top: axisY, height: labelTop - axisY }
                  }
                />
                {/* Dot */}
                <span
                  className={`absolute z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card ${
                    next ? "outline-2 outline-offset-2 outline-(--brand-red)" : ""
                  }`}
                  style={{ left: x, top: axisY, backgroundColor: color }}
                />
                {/* Label */}
                <button
                  onClick={() => navigate({ to: "/events/$eventId", params: { eventId: e.id } })}
                  title={`${e.title} · ${e.status}${company ? ` · ${company}` : ""}`}
                  className="group absolute z-10 flex h-8 flex-col justify-center rounded-[3px] bg-card px-1.5 text-left transition-colors hover:bg-accent"
                  style={{ left, top: labelTop, width: w }}
                >
                  <span className="microlabel tnum text-[9px] text-muted-foreground">
                    {parseLocalDate(e.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                    {next && <span className="ml-1.5 text-(--brand-red)">Next</span>}
                  </span>
                  <span
                    className={`truncate text-xs font-medium leading-tight ${cancelled ? "line-through" : ""}`}
                  >
                    {e.title}
                  </span>
                </button>
              </div>
            );
          })}

          {width > 0 && inTerm.length === 0 && (
            <p
              className="absolute inset-x-0 text-center text-xs text-muted-foreground"
              style={{ top: axisY - 26 }}
            >
              No dated events this term.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
