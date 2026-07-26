"use client";

import { ResponsiveContainer, AreaChart, Area } from "recharts";

// Tiny inline trend line for the KPI cards. No axes, no grid — just a smooth
// gradient area. `id` must be unique per instance (gradient defs collide
// otherwise when several sparklines share a page).
export function Sparkline({
  data, color, id,
}: {
  data: number[];
  color: string;
  id: string;
}) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
