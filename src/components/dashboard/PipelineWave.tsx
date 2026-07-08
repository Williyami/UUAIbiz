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
const H = 116;
const MID = H / 2;
const MIN_H = 3; // half-thickness where the pipe runs empty
const MAX_H = 42;

/**
 * The outreach pipeline as a fluid open pipe: the upper and lower edges are
 * drawn as lines that swell apart at each stage in proportion to its count,
 * with a hollow middle. Stroke color flows through the stage colors.
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

  const edge = (sign: 1 | -1) => {
    let d = `M 0 ${MID + sign * pts[0].h}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${MID + sign * p0.h}, ${cx} ${MID + sign * p1.h}, ${p1.x} ${MID + sign * p1.h}`;
    }
    return d;
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 py-4">
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
          </defs>
          <title>{STAGES.map((s, i) => `${s}: ${counts[i]}`).join("  ·  ")}</title>
          {([1, -1] as const).map((sign) => (
            <path
              key={sign}
              d={edge(sign)}
              fill="none"
              stroke="url(#pipeline-pipe)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
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
