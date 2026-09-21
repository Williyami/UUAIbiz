import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { semesterBounds } from "@/components/events/eventStyles";
import { formatSEK } from "@/lib/format";
import { monthlySeries } from "@/lib/finance";

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--status-success)" },
  costs: { label: "Costs", color: "var(--brand-red)" },
} satisfies ChartConfig;

/**
 * Revenue vs costs per month for the current semester. The dashboard passes
 * events alone; the Finance page also passes ledger entries so the bars match
 * the balance shown beside them.
 */
export function CashflowChart({ events, entries = [] }: { events: any[]; entries?: any[] }) {
  const sem = semesterBounds();
  const data = monthlySeries(events, entries, sem.start);

  const hasData = data.some((d) => d.revenue > 0 || d.costs > 0);

  if (!hasData) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12 text-center text-sm text-muted-foreground">
        No revenue or costs recorded for {sem.label} yet — they'll show up here as events get
        booked.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="max-h-64 w-full px-4 pb-4">
      <BarChart accessibilityLayer data={data} barGap={3}>
        <CartesianGrid vertical={false} strokeDasharray="2 4" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.07em" }}
        />
        <ChartTooltip
          cursor={{ fill: "var(--accent)", opacity: 0.5 }}
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="microlabel text-[9.5px] text-muted-foreground">
                    {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                  </span>
                  <span className="tnum font-mono text-xs">{formatSEK(Number(value))}</span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[2, 2, 0, 0]} maxBarSize={28} />
        <Bar dataKey="costs" fill="var(--color-costs)" radius={[2, 2, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ChartContainer>
  );
}
