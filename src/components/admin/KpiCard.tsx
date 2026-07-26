import Link from "next/link";
import { ArrowUpRight, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";

// Hero KPI card in the reference dashboard style: icon + label header with a
// jump-to arrow, a large value with an inline sparkline, and a coloured
// week-over-week delta. The lead card (`filled`) uses the brand red gradient
// with white content; the rest are white cards with red sparklines.
export function KpiCard({
  label, value, delta, deltaSuffix = "this week", data, icon: Icon,
  filled = false, href, id,
}: {
  label: string;
  value: string | number;
  delta?: number | null;
  deltaSuffix?: string;
  data: number[];
  icon: LucideIcon;
  filled?: boolean;
  href?: string;
  id: string;
}) {
  const hasDelta = delta != null && Number.isFinite(delta);
  const up = (delta ?? 0) >= 0;
  const DeltaIcon = up ? TrendingUp : TrendingDown;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 transition",
        filled
          ? "border-transparent text-white shadow-[0_18px_40px_-18px_rgba(227,6,19,0.6)]"
          : "border-line bg-white hover:border-red/40 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.25)]",
      )}
      style={filled ? { background: "linear-gradient(135deg, var(--red), var(--red-dark))" } : undefined}
    >
      {/* Header: icon chip + label, jump arrow top-right */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full",
              filled ? "bg-white/20 text-white" : "bg-red-soft text-red",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className={cn("text-sm font-semibold", filled ? "text-white/90" : "text-muted-foreground")}>
            {label}
          </span>
        </div>
        {href && (
          <Link
            href={href}
            aria-label={`Open ${label}`}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border transition",
              filled
                ? "border-white/30 text-white hover:bg-white/15"
                : "border-line text-muted-foreground hover:border-red hover:text-red",
            )}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Value + inline sparkline */}
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className={cn("text-3xl font-extrabold tracking-tight", filled ? "text-white" : "text-ink")}>
          {value}
        </div>
        <div className="h-10 w-24 shrink-0">
          <Sparkline
            data={data.length ? data : [0, 0]}
            color={filled ? "rgba(255,255,255,0.9)" : "#e30613"}
            id={`spark-${id}`}
          />
        </div>
      </div>

      {/* Delta */}
      {hasDelta && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
          <DeltaIcon
            className={cn("h-3.5 w-3.5", filled ? "text-white" : up ? "text-ok" : "text-red")}
          />
          <span className={cn(filled ? "text-white" : up ? "text-ok" : "text-red")}>
            {up ? "+" : ""}{delta!.toFixed(1)}%
          </span>
          <span className={filled ? "text-white/70" : "text-muted-foreground"}>{deltaSuffix}</span>
        </div>
      )}
    </div>
  );
}
