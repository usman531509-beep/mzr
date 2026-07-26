"use client";

import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip,
} from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Point = { date: string; revenue: number; orders: number };

const money = (n: number) =>
  n >= 1000 ? `£${(n / 1000).toFixed(1)}k` : `£${n.toFixed(0)}`;
const moneyFull = (n: number) =>
  `£${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Large sales trend panel styled after the reference dashboard: header with a
// big total + delta pill on the left and a period label on the right, then a
// smooth red gradient area chart with a floating value tooltip.
export function SalesTrendCard({
  data, total, delta, rangeLabel,
}: {
  data: Point[];
  total: number;
  delta: number | null;
  rangeLabel: string;
}) {
  const hasDelta = delta != null && Number.isFinite(delta);
  const up = (delta ?? 0) >= 0;
  const DeltaIcon = up ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-ink">Sales trend</h3>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-2xl font-extrabold tracking-tight text-ink">{moneyFull(total)}</span>
            {hasDelta && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
                  up ? "bg-ok/10 text-ok" : "bg-red-soft text-red",
                )}
              >
                <DeltaIcon className="h-3 w-3" />
                {up ? "+" : ""}{delta!.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
        <span className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          {rangeLabel}
        </span>
      </div>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e30613" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#e30613" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#eef0f2" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              minTickGap={24}
            />
            <YAxis
              stroke="#9ca3af"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={52}
              tickFormatter={(v: number) => money(v)}
            />
            <Tooltip
              cursor={{ stroke: "#e30613", strokeDasharray: "4 4", strokeOpacity: 0.4 }}
              contentStyle={{
                background: "#0b0d12",
                border: "none",
                borderRadius: 10,
                fontSize: 12,
                color: "#fff",
                boxShadow: "0 8px 24px rgba(0,0,0,.2)",
                padding: "8px 12px",
              }}
              itemStyle={{ color: "#fff" }}
              labelStyle={{ color: "rgba(255,255,255,.6)", marginBottom: 2 }}
              formatter={(value, key) => {
                const v = Number(value ?? 0);
                return key === "revenue" ? [moneyFull(v), "Revenue"] : [v, "Orders"];
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#e30613"
              strokeWidth={2.5}
              fill="url(#salesTrendFill)"
              activeDot={{ r: 5, fill: "#e30613", stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
