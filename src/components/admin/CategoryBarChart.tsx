"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";

const PALETTE = [
  "#e8151b", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#22d3ee", "#a3e635",
];

export function CategoryBarChart({
  data,
}: {
  data: { name: string; revenue: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        No sales data yet.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
        <XAxis
          type="number"
          stroke="rgba(255,255,255,0.4)"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(v: number) =>
            v >= 1000 ? `£${(v / 1000).toFixed(1)}k` : `£${v.toFixed(0)}`
          }
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="rgba(255,255,255,0.6)"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={100}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{
            background: "#0f1115",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(v: number) => [
            v >= 1000 ? `£${(v / 1000).toFixed(1)}k` : `£${v.toFixed(0)}`,
            "Revenue",
          ]}
        />
        <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
