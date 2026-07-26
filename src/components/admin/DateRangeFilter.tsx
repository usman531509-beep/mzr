"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS = [
  { value: "today",  label: "Today"      },
  { value: "week",   label: "This week"  },
  { value: "month",  label: "This month" },
  { value: "90d",    label: "90 days"    },
  { value: "all",    label: "All time"   },
] as const;

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const range = sp.get("range") ?? "month";
  const fromUrl = sp.get("from") ?? "";
  const toUrl   = sp.get("to")   ?? "";

  const [from, setFrom] = useState(fromUrl);
  const [to,   setTo]   = useState(toUrl);

  const setRange = (value: string) => {
    const params = new URLSearchParams(sp.toString());
    params.set("range", value);
    if (value !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const applyCustom = () => {
    if (!from || !to) return;
    const params = new URLSearchParams(sp.toString());
    params.set("range", "custom");
    params.set("from", from);
    params.set("to", to);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    // Reference toolbar + `.chip` row: white panel, pill presets (active =
    // solid red), bordered date inputs and a red primary Apply button.
    <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-line bg-white p-3">
      <div className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        Range
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setRange(p.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              range === p.value
                ? "border-red bg-red text-white"
                : "border-line bg-white text-muted-foreground hover:border-red hover:text-red",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {/* Custom range: styled native date inputs grouped in a single bordered
          pill, then a red Apply. Native inputs are used directly (not <Input>)
          so we can size them to content and tint the calendar picker icon. */}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1 focus-within:border-red">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From date"
            className="h-7 bg-transparent px-1 text-sm text-ink outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-55 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
          />
          <span className="text-xs font-medium text-muted-foreground">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To date"
            className="h-7 bg-transparent px-1 text-sm text-ink outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-55 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
          />
        </div>
        <button
          type="button"
          disabled={!from || !to}
          onClick={applyCustom}
          className="h-9 rounded-lg bg-red px-4 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
