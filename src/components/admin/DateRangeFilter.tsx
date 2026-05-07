"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-2">
      <div className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        Range
      </div>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setRange(p.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition",
              range === p.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-8 w-[150px]"
          aria-label="From date"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-8 w-[150px]"
          aria-label="To date"
        />
        <Button size="sm" variant="outline" disabled={!from || !to} onClick={applyCustom}>
          Apply
        </Button>
      </div>
    </div>
  );
}
