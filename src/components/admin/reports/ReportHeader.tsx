"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Shared "chrome" for every report page. Renders a quick-preset
// dropdown side-by-side with two date inputs so the date range is
// always visible and editable. Picking a preset writes `?range=<key>`
// and clears any custom dates; editing a date flips `?range=custom`
// and writes `from` / `to` directly. The resolved bounds come in via
// props so the inputs always reflect the *applied* range, including
// when a preset like "Last 7 days" expands to a concrete window.

const RANGES = [
  { value: "today",   label: "Today" },
  { value: "week",    label: "Last 7 days" },
  { value: "month",   label: "Last 30 days" },
  { value: "quarter", label: "Last 90 days" },
  { value: "ytd",     label: "Year to date" },
  { value: "year",    label: "Last 365 days" },
  { value: "all",     label: "All time" },
] as const;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function ReportHeader({
  title, subtitle, exportPath, currentRange, currentFrom, currentTo,
}: {
  title: string;
  subtitle?: string;
  /** Base path for the CSV / PDF export routes. The component appends
   *  `?format=csv` / `?format=pdf` plus the current range params. */
  exportPath: string;
  currentRange: string;
  /** Resolved start of the active range, ISO date (YYYY-MM-DD).
   *  Empty string when the range is unbounded (e.g. "All time"). */
  currentFrom: string;
  /** Resolved end of the active range, ISO date. Empty when unbounded. */
  currentTo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const setRange = (next: string) => {
    const params = new URLSearchParams(sp.toString());
    params.set("range", next);
    // Presets compute their own from/to server-side, so strip any
    // stale custom params on the way in.
    params.delete("from");
    params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  };

  const setCustomDate = (key: "from" | "to", value: string) => {
    if (!value) return;
    const params = new URLSearchParams(sp.toString());
    params.set("range", "custom");
    params.set(key, value);
    // Editing one end while the other is empty (e.g. "All time") needs
    // a sensible default for the missing end so resolveRange validates.
    const today = isoDate(new Date());
    if (key === "from" && !params.get("to")) params.set("to", today);
    if (key === "to"   && !params.get("from")) params.set("from", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const exportHref = (format: "csv" | "pdf") => {
    const params = new URLSearchParams(sp.toString());
    params.set("format", format);
    return `${exportPath}?${params.toString()}`;
  };

  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={currentRange === "custom" ? "" : currentRange} onValueChange={setRange}>
            <SelectTrigger className="h-9 w-[160px] text-sm">
              <SelectValue placeholder="Custom range" />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="date"
            aria-label="Start date"
            value={currentFrom}
            max={currentTo || undefined}
            onChange={(e) => setCustomDate("from", e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            aria-label="End date"
            value={currentTo}
            min={currentFrom || undefined}
            max={isoDate(new Date())}
            onChange={(e) => setCustomDate("to", e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={exportHref("csv")} download>
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
        </Button>
        <Button asChild size="sm">
          <a href={exportHref("pdf")} download>
            <FileText className="h-3.5 w-3.5" /> PDF
          </a>
        </Button>
      </div>
    </header>
  );
}
