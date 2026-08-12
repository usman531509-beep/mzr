"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboOption = { value: string; label: string; hint?: string };

// Lightweight searchable select (no cmdk dependency). Popover + a filter input
// + a scrollable option list. Drop-in for shadcn <Select> where the option set
// is large enough to want type-to-filter.
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results.",
  disabled,
  className,
}: {
  options: ComboOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  // A Radix Dialog's scroll-lock (react-remove-scroll) attaches `wheel` and
  // `touchmove` handlers on `document` (bubble phase, non-passive) that
  // preventDefault every scroll outside the dialog's own subtree — and this
  // popover is portaled OUTSIDE it. Since those handlers are bubble-phase (not
  // capture), an element-level listener on the list runs FIRST, so:
  //   · wheel (desktop): scroll the list ourselves + preventDefault (no double
  //     scroll) + stopPropagation so the lock never blocks it.
  //   · touchmove (mobile): just stopPropagation — the event never reaches the
  //     lock, so the browser scrolls the list natively (with momentum). We must
  //     NOT preventDefault here or we'd kill the native touch scroll.
  // A ref *callback* (not useEffect) guarantees the listeners attach the instant
  // the node mounts — no race with the Radix portal. React 19 runs the returned
  // cleanup on unmount.
  const bindScroll = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      if (node.scrollHeight <= node.clientHeight) return;
      node.scrollTop += e.deltaY;
      e.preventDefault();
      e.stopPropagation();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (node.scrollHeight <= node.clientHeight) return;
      e.stopPropagation();
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(s) || o.hint?.toLowerCase().includes(s),
    );
  }, [q, options]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 opacity-50" />
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div
          ref={bindScroll}
          className="combobox-scroll overscroll-contain p-1"
          style={{ maxHeight: "16rem", overflowY: "auto", WebkitOverflowScrolling: "touch" }}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
          ) : (
            filtered.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm transition hover:bg-accent",
                  o.value === value && "bg-accent/60",
                )}
              >
                <Check className={cn("h-4 w-4 shrink-0 text-red", o.value === value ? "opacity-100" : "opacity-0")} />
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.hint && <span className="shrink-0 text-xs text-muted-foreground">{o.hint}</span>}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
