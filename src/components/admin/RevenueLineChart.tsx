"use client";

import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip,
} from "recharts";

type Point = { date: string; revenue: number; orders: number };

const fmt = (n: number) =>
  n >= 1000 ? `£${(n / 1000).toFixed(1)}k` : `£${n.toFixed(0)}`;

export function RevenueLineChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#10b981" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="rgba(255,255,255,0.4)"
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <YAxis
          stroke="rgba(255,255,255,0.4)"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(v: number) => fmt(v)}
        />
        <Tooltip
          cursor={{ stroke: "rgba(255,255,255,0.15)" }}
          contentStyle={{
            background: "#0f1115",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(value, key) => {
            const v = Number(value ?? 0);
            return key === "revenue" ? [fmt(v), "Revenue"] : [v, "Orders"];
          }}
          labelStyle={{ color: "rgba(255,255,255,0.6)" }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#rev)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
