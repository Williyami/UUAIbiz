import { StatusTag } from "@/components/shared/StatusTag";
import type { CompanyStatus } from "@/components/outreach/statusStyles";

const STAGES = ["Contacted", "Discussing", "Negotiating", "Booked"] as const satisfies readonly CompanyStatus[];
// Theme-adaptive: built from status tokens (which already shift per theme)
// instead of --foreground, which turns these muddy in light mode.
const STAGE_COLORS: Record<(typeof STAGES)[number], string> = {
  Contacted: "var(--status-neutral)",
  Discussing: "color-mix(in oklch, var(--brand-red) 40%, var(--status-neutral))",
  Negotiating: "var(--brand-red)",
  Booked: "var(--status-success)",
};

const W = 800;
const H = 150;
const MID = H / 2;
const MIN_H = 6; // half-thickness of an empty pipe section
const MAX_H = MID - 16;

/**
 * The outreach pipeline as a horizontal pipe: one section per stage,
 * thickness proportional to how many companies sit in that stage.
 */
export function PipelineWave({ companies }: { companies: any[] }) {
  const counts = STAGES.map((s) => companies.filter((c) => c.status === s).length);
  const maxV = Math.max(...counts, 1);

  if (companies.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12 text-center text-sm text-muted-foreground">
        No companies in the pipeline yet.
      </div>
    );
  }

  const seg = W / STAGES.length;
  // control points: pipe enters thin, swells to each stage's thickness at its center
  const pts = [
    { x: 0, h: Math.max(counts[0] ? (counts[0] / maxV) * MAX_H * 0.5 : MIN_H, MIN_H) },
    ...STAGES.map((_, i) => ({
      x: seg * (i + 0.5),
      h: counts[i] === 0 ? MIN_H : MIN_H + (counts[i] / maxV) * (MAX_H - MIN_H),
    })),
    { x: W, h: Math.max(counts[3] ? (counts[3] / maxV) * MAX_H * 0.5 : MIN_H, MIN_H) },
  ];

  let d = `M 0 ${MID - pts[0].h}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${MID - p0.h}, ${cx} ${MID - p1.h}, ${p1.x} ${MID - p1.h}`;
  }
  d += ` L ${W} ${MID + pts[pts.length - 1].h}`;
  for (let i = pts.length - 2; i >= 0; i--) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${MID + p1.h}, ${cx} ${MID + p0.h}, ${p0.x} ${MID + p0.h}`;
  }
  d += " Z";

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden="true">
          <defs>
            <linearGradient id="pipeline-pipe" x1="0" y1="0" x2="1" y2="0">
              {STAGES.map((s, i) => (
                <stop
                  key={s}
                  offset={`${((seg * (i + 0.5)) / W) * 100}%`}
                  stopColor={STAGE_COLORS[s]}
                />
              ))}
            </linearGradient>
            <linearGradient id="pipeline-sheen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--card)" stopOpacity="0.48" />
              <stop offset="44%" stopColor="var(--card)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--foreground)" stopOpacity="0.18" />
            </linearGradient>
            <pattern id="pipeline-ledger" width="40" height="18" patternUnits="userSpaceOnUse">
              <path
                d="M 0 17.5 H 40"
                stroke="var(--border)"
                strokeOpacity="0.42"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            fill="url(#pipeline-ledger)"
            opacity="0.55"
          />
          {/* stage boundaries */}
          {STAGES.slice(1).map((_, i) => (
            <line
              key={i}
              x1={seg * (i + 1)}
              x2={seg * (i + 1)}
              y1={12}
              y2={H - 12}
              stroke="color-mix(in oklch, var(--brand-red) 24%, var(--border))"
              strokeWidth="1"
              strokeDasharray="2 6"
            />
          ))}
          {/* midline */}
          <line
            x1={0}
            x2={W}
            y1={MID}
            y2={MID}
            stroke="var(--foreground)"
            strokeOpacity="0.18"
            strokeWidth="1"
          />
          {/* the pipe */}
          <path d={d} fill="url(#pipeline-pipe)" fillOpacity="0.92" />
          <path d={d} fill="url(#pipeline-sheen)" />
          <path
            d={d}
            fill="none"
            stroke="color-mix(in oklch, var(--brand-red) 40%, var(--border))"
            strokeOpacity="0.6"
            strokeWidth="1.5"
          />
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-2 divide-x border-t bg-muted/25 sm:grid-cols-4">
        {STAGES.map((s, i) => (
          <div key={s} className="flex items-center justify-between gap-2 px-4 py-3">
            <StatusTag color={STAGE_COLORS[s]} className="text-[9.5px]">
              {s}
            </StatusTag>
            <span className="tnum font-display text-xl font-medium leading-none text-foreground">
              {counts[i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
