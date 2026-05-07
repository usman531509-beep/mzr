"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS: Record<string, string> = {
  PENDING:   "#f59e0b",
  PAID:      "#3b82f6",
  SHIPPED:   "#6366f1",
  DELIVERED: "#10b981",
  CANCELLED: "#ef4444",
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
          stroke="rgba(0,0,0,0.4)"
        >
          {data.map((d) => (
            <Cell key={d.status} fill={COLORS[d.status] ?? "#64748b"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#0f1115",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(value, name) => [Number(value ?? 0), String(name)]}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
