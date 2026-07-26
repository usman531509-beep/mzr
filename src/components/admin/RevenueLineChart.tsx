"use client";

import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip,
} from "recharts";

type Point = { date: string; revenue: number; orders: number };

const fmt = (n: number) =>
  n >= 1000 ? `£${(n / 1000).toFixed(1)}k` : `£${n.toFixed(0)}`;

// Light reference styling: #6b7280 axes, #e7e7ea grid, red primary series,
// white tooltip with ink text.
export function RevenueLineChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#e30613" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#e30613" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e7e7ea" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <YAxis
          stroke="#6b7280"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(v: number) => fmt(v)}
        />
        <Tooltip
          cursor={{ stroke: "#e7e7ea" }}
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #e7e7ea",
            borderRadius: 8,
            fontSize: 12,
            color: "#0b0d12",
            boxShadow: "0 2px 6px rgba(0,0,0,.05)",
          }}
          formatter={(value, key) => {
            const v = Number(value ?? 0);
            return key === "revenue" ? [fmt(v), "Revenue"] : [v, "Orders"];
          }}
          labelStyle={{ color: "#6b7280" }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#e30613"
          strokeWidth={2}
          fill="url(#rev)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
