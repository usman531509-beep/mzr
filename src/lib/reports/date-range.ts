// Shared date-range helper for the Reports module. Every report route
// reads `?range=<preset>` (or `?from`/`?to` for the custom case) so the
// URL is shareable and the same parsing lives in one place.

export type RangePreset =
  | "today"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "ytd"
  | "all"
  | "custom";

export type ResolvedRange = {
  /** Inclusive start. `null` means "no lower bound" (all-time). */
  from: Date | null;
  /** Inclusive end. `null` means "no upper bound" (all-time). */
  to: Date | null;
  /** Display string for headers / file names. */
  label: string;
  /** Stable preset key for the URL — useful for round-tripping. */
  preset: RangePreset;
  /** Days in range, or null for unbounded ranges. */
  days: number | null;
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const daysBetween = (a: Date, b: Date) =>
  Math.max(1, Math.ceil((b.getTime() - a.getTime()) / 86_400_000));

export function resolveRange(
  sp: Record<string, string | string[] | undefined>,
  fallback: RangePreset = "month",
): ResolvedRange {
  const raw = (typeof sp.range === "string" ? sp.range : fallback) as RangePreset;
  const now = new Date();
  const todayStart = startOfDay(now);

  if (raw === "custom") {
    const from = typeof sp.from === "string" ? new Date(sp.from) : null;
    const to   = typeof sp.to   === "string" ? new Date(sp.to)   : null;
    if (from && to && !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      const f = startOfDay(from);
      const t = endOfDay(to);
      return {
        from: f, to: t, preset: "custom", days: daysBetween(f, t),
        label: `${f.toLocaleDateString()} – ${t.toLocaleDateString()}`,
      };
    }
    // fall through to default when the params are bad
  }
  if (raw === "today") {
    return { from: todayStart, to: now, preset: "today", days: 1, label: "Today" };
  }
  if (raw === "week") {
    const f = new Date(todayStart);
    f.setDate(todayStart.getDate() - 6);
    return { from: f, to: now, preset: "week", days: 7, label: "Last 7 days" };
  }
  if (raw === "quarter") {
    const f = new Date(todayStart);
    f.setDate(todayStart.getDate() - 89);
    return { from: f, to: now, preset: "quarter", days: 90, label: "Last 90 days" };
  }
  if (raw === "ytd") {
    const f = new Date(now.getFullYear(), 0, 1);
    return { from: f, to: now, preset: "ytd", days: daysBetween(f, now), label: "Year to date" };
  }
  if (raw === "year") {
    const f = new Date(todayStart);
    f.setDate(todayStart.getDate() - 364);
    return { from: f, to: now, preset: "year", days: 365, label: "Last 365 days" };
  }
  if (raw === "all") {
    return { from: null, to: null, preset: "all", days: null, label: "All time" };
  }
  // default: month (last 30 days)
  const f = new Date(todayStart);
  f.setDate(todayStart.getDate() - 29);
  return { from: f, to: now, preset: "month", days: 30, label: "Last 30 days" };
}

/** Slug-safe label for filenames. */
export function rangeForFilename(r: ResolvedRange): string {
  if (!r.from || !r.to) return "all-time";
  return `${r.from.toISOString().slice(0, 10)}_${r.to.toISOString().slice(0, 10)}`;
}
