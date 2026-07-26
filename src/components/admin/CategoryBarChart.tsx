"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

const fmtGBP = (v: number) =>
  v >= 1000 ? `£${(v / 1000).toFixed(1)}k` : `£${v.toFixed(0)}`;

// Single red series on light axes/grid, matching the reference chart panels.
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
        <CartesianGrid stroke="#e7e7ea" horizontal={false} />
        <XAxis
          type="number"
          stroke="#6b7280"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(v: number) => fmtGBP(v)}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#6b7280"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={100}
        />
        <Tooltip
          cursor={{ fill: "rgba(11,13,18,0.04)" }}
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #e7e7ea",
            borderRadius: 8,
            fontSize: 12,
            color: "#0b0d12",
            boxShadow: "0 2px 6px rgba(0,0,0,.05)",
          }}
          formatter={(value) => [fmtGBP(Number(value ?? 0)), "Revenue"]}
        />
        <Bar dataKey="revenue" fill="#e30613" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
