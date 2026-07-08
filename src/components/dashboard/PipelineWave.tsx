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
const H = 72;
const MID = H / 2;
const MIN_H = 2; // half-thickness where the pipe runs empty
const MAX_H = 26; // half-thickness of the fullest stage — a ribbon, not a blob

/**
 * The outreach pipeline as a slim ribbon flowing left to right: thickness at
 * each stage is proportional to how many companies sit there, with crisp
 * flat color blocks per stage. No gradients, sheen or backdrop ruling.
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
  const half = (i: number) => (counts[i] === 0 ? MIN_H : MIN_H + (counts[i] / maxV) * (MAX_H - MIN_H));

  // Thickness anchors: pipe enters/exits at its neighbouring stage's size and
  // swells to each stage's thickness across the middle half of its segment,
  // so color boundaries land on straight, calm sections.
  const pts: { x: number; h: number }[] = [{ x: 0, h: half(0) }];
  STAGES.forEach((_, i) => {
    pts.push({ x: seg * (i + 0.3), h: half(i) });
    pts.push({ x: seg * (i + 0.7), h: half(i) });
  });
  pts.push({ x: W, h: half(STAGES.length - 1) });

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
      <div className="px-4 py-5">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden="true">
          <defs>
            {/* hard stops: one flat color block per stage, crisp boundaries */}
            <linearGradient id="pipeline-pipe" x1="0" y1="0" x2="1" y2="0">
              {STAGES.flatMap((s, i) => [
                <stop
                  key={`${s}-a`}
                  offset={`${(i / STAGES.length) * 100}%`}
                  stopColor={STAGE_COLORS[s]}
                />,
                <stop
                  key={`${s}-b`}
                  offset={`${((i + 1) / STAGES.length) * 100}%`}
                  stopColor={STAGE_COLORS[s]}
                />,
              ])}
            </linearGradient>
          </defs>
          <path d={d} fill="url(#pipeline-pipe)">
            <title>{STAGES.map((s, i) => `${s}: ${counts[i]}`).join("  ·  ")}</title>
          </path>
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
