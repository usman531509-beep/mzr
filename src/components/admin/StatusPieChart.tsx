"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

// Status hues mapped to the light reference palette: warn gold for pending,
// info blue for paid, brand red for shipped (reference "dispatched"), ok
// green for delivered, bad red for cancelled.
const COLORS: Record<string, string> = {
  PENDING:   "#b8860b",
  PAID:      "#1e57c3",
  SHIPPED:   "#e30613",
  DELIVERED: "#0a8a3a",
  CANCELLED: "#c0392b",
};

export function StatusPieChart({ data }: { data: { status: string; count: number }[] }) {
  if (data.every((d) => d.count === 0)) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No orders yet.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          innerRadius={45}
          outerRadius={75}
          paddingAngle={2}
          stroke="#ffffff"
        >
          {data.map((d) => (
            <Cell key={d.status} fill={COLORS[d.status] ?? "#9ca3af"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #e7e7ea",
            borderRadius: 8,
            fontSize: 12,
            color: "#0b0d12",
            boxShadow: "0 2px 6px rgba(0,0,0,.05)",
          }}
          formatter={(value, name) => [Number(value ?? 0), String(name)]}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 11, color: "#6b7280" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
