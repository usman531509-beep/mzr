"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { fmtMoney } from "@/lib/format";

type Slice = { name: string; revenue: number };

// Monochrome-red ramp (plus a neutral tail) so the donut stays on-brand while
// still separating the slices clearly.
const RAMP = ["#e30613", "#99000b", "#f5555f", "#f79aa0", "#fbccd0", "#9ca3af"];

// "Sales by category" donut in the reference style: ring chart with the total
// in the centre and a two-column legend of category → revenue underneath.
export function CategoryDonut({ data }: { data: Slice[] }) {
  const slices = data.filter((d) => d.revenue > 0).slice(0, 6);
  const total = slices.reduce((s, d) => s + d.revenue, 0);

  if (slices.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white p-5">
        <h3 className="text-base font-bold text-ink">Sales by category</h3>
        <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
          No sales yet.
        </div>
      </div>
    );
  }

  const withColor = slices.map((d, i) => ({ ...d, color: RAMP[i % RAMP.length] }));
  const topShare = Math.round((withColor[0].revenue / total) * 100);

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <h3 className="text-base font-bold text-ink">Sales by category</h3>

      <div className="relative mt-2">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={withColor}
              dataKey="revenue"
              nameKey="name"
              innerRadius={68}
              outerRadius={95}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
            >
              {withColor.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#0b0d12",
                border: "none",
                borderRadius: 10,
                fontSize: 12,
                color: "#fff",
                padding: "8px 12px",
              }}
              itemStyle={{ color: "#fff" }}
              formatter={(value, name) => [fmtMoney(Number(value ?? 0)), String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Centre label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xl font-extrabold tracking-tight text-ink">{fmtMoney(total)}</div>
          <span className="mt-1 inline-flex items-center rounded-full bg-red-soft px-2 py-0.5 text-[11px] font-bold text-red">
            {topShare}% {withColor[0].name}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {withColor.map((d) => (
          <div key={d.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="truncate text-muted-foreground">{d.name}</span>
            </span>
            <span className="shrink-0 font-semibold text-ink">{fmtMoney(d.revenue)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
