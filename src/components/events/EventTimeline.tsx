import { useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { eventStatusColor, eventCompanyNames, type EventStatus } from "./eventStyles";
import { parseLocalDate } from "@/lib/format";

/*
 * A quiet strip of events in date order along one thin line. Events are spaced
 * evenly rather than to scale, so nothing ever overlaps and every event gets
 * the same room: a big day number, month and weekday, title, partner. A "Today"
 * marker sits where today falls between them, and the strip opens scrolled to
 * the next event. It shows whatever the filters above it leave.
 */

const COL = 176; // px per event

export function EventTimeline({ events, companies }: { events: any[]; companies: any[] }) {
  const navigate = useNavigate();
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const today = new Date(new Date().toDateString()).getTime();
  const dated = events
    .filter((e) => e.date)
    .map((e) => ({ e, t: parseLocalDate(e.date).getTime() }))
    .sort((a, b) => a.t - b.t);
  const firstUpcoming = dated.findIndex(({ t }) => t >= today);
  const todayAt = firstUpcoming === -1 ? dated.length : firstUpcoming;
  const nextId = dated.find(
    ({ e, t }) => t >= today && e.status !== "Cancelled" && e.status !== "Idea",
  )?.e.id;

  function updateEdges() {
    const sc = scroller.current;
    if (!sc) return;
    setEdges({
      start: sc.scrollLeft > 4,
      end: sc.scrollLeft + sc.clientWidth < sc.scrollWidth - 4,
    });
  }

  // Open with one past event in view, then what's coming.
  useLayoutEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    sc.scrollLeft = Math.max(0, (todayAt - 1) * COL);
    updateEdges();
    // Only when the set of events changes, not on every render.
  }, [dated.length, todayAt]);

  function page(dir: 1 | -1) {
    const sc = scroller.current;
    sc?.scrollBy({ left: dir * Math.max(COL, sc.clientWidth - COL), behavior: "smooth" });
  }

  if (dated.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        No dated events match the filters.
      </p>
    );
  }

  const columns: React.ReactNode[] = [];
  dated.forEach(({ e, t }, i) => {
    if (i === todayAt) columns.push(<TodayMark key="today" />);
    const d = new Date(t);
    const past = t < today;
    const cancelled = e.status === "Cancelled";
    const next = e.id === nextId;
    const partner = eventCompanyNames(e, companies)[0];
    columns.push(
      <li key={e.id} className="shrink-0 snap-start" style={{ width: COL }}>
        <button
          onClick={() => navigate({ to: "/events/$eventId", params: { eventId: e.id } })}
          title={`${e.title} · ${e.status}${partner ? ` · ${partner}` : ""}`}
          className={`group block w-full pr-4 text-left transition-opacity ${past || cancelled ? "opacity-45 hover:opacity-80" : ""}`}
        >
          {/* Dot on the line */}
          <span className="relative flex h-5 items-center">
            <span
              className={`size-2 rounded-full transition-transform group-hover:scale-150 ${
                next ? "ring-2 ring-(--brand-red)/30 ring-offset-2 ring-offset-background" : ""
              }`}
              style={{
                backgroundColor:
                  eventStatusColor[e.status as EventStatus] ?? "var(--muted-foreground)",
              }}
            />
          </span>
          <span className="mt-2 flex items-baseline gap-2">
            <span
              className={`tnum font-display text-2xl font-medium leading-none tracking-tight ${next ? "text-(--brand-red)" : ""}`}
            >
              {d.getDate()}
            </span>
            <span className="microlabel text-[9.5px] text-muted-foreground">
              {d.toLocaleDateString("en-GB", { month: "short" })} ·{" "}
              {d.toLocaleDateString("en-GB", { weekday: "short" })}
              {d.getFullYear() !== new Date().getFullYear() && ` ${d.getFullYear()}`}
            </span>
          </span>
          <span
            className={`mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug group-hover:underline group-hover:underline-offset-2 ${cancelled ? "line-through" : ""}`}
          >
            {e.title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {partner ?? e.event_type}
          </span>
        </button>
      </li>,
    );
  });
  if (todayAt === dated.length) columns.push(<TodayMark key="today" />);

  return (
    <section className="group/timeline relative">
      <div
        ref={scroller}
        onScroll={updateEdges}
        className="relative snap-x overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ol className="relative flex w-max">
          {/* The line, through the middle of the dots */}
          <span aria-hidden className="absolute inset-x-0 top-2.5 h-px bg-border" />
          {columns}
        </ol>
      </div>

      {/* Soft edges and arrows only where there's more to see */}
      {edges.start && (
        <>
          <span className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
          <ScrollButton side="left" onClick={() => page(-1)} />
        </>
      )}
      {edges.end && (
        <>
          <span className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
          <ScrollButton side="right" onClick={() => page(1)} />
        </>
      )}
    </section>
  );
}

function TodayMark() {
  return (
    <li aria-label="Today" className="relative w-14 shrink-0">
      <span className="absolute left-0 top-0 h-full w-px bg-(--brand-red)/50" />
      <span className="microlabel absolute left-2 top-0 text-[9px] text-(--brand-red)">Today</span>
    </li>
  );
}

function ScrollButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      aria-label={side === "left" ? "Earlier events" : "Later events"}
      className={`absolute top-0 flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/timeline:opacity-100 ${
        side === "left" ? "left-0" : "right-0"
      }`}
    >
      <Icon className="h-3 w-3" />
    </button>
  );
}
