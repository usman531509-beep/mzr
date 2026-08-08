"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtMoney } from "@/lib/format";

// Inline navbar search — real input field with live autocomplete dropdown.
// Mirrors the logic of the mobile SearchOverlay (debounced fetch to
// /api/search, ↑↓ keyboard nav, Enter to navigate) but renders the
// results popover anchored under the input instead of in a full-screen
// modal. The overlay component stays in the app for mobile and Cmd+K
// power users — both reach the same /api/search endpoint.

type Result = {
  id: string;
  slug: string;
  name: string;
  price: string;
  stock: number;
  image: string | null;
  brand: string;
  category: string;
  categorySlug: string;
  oemNumber: string | null;
  sku: string | null;
};

export function NavSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const trimmed = q.trim();
  const dropdownOpen = open && trimmed.length >= 2;

  // Debounced live search — identical contract to SearchOverlay so the
  // server endpoint doesn't have to care which UI made the call.
  useEffect(() => {
    if (trimmed.length < 2) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const ctl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: ctl.signal,
          cache: "no-store",
        });
        if (!r.ok) throw new Error("bad status");
        const data = await r.json();
        setResults(data.results ?? []);
        setTotal(data.total ?? 0);
        setActive(0);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setResults([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { ctl.abort(); clearTimeout(t); };
  }, [trimmed]);

  // Close the dropdown on outside click so it doesn't shadow the rest of
  // the page after the customer moves on.
  useEffect(() => {
    if (!dropdownOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [dropdownOpen]);

  const navigate = (slug: string) => {
    setOpen(false);
    inputRef.current?.blur();
    router.push(`/products/${slug}`);
  };

  const submitAll = () => {
    if (!trimmed) return;
    setOpen(false);
    inputRef.current?.blur();
    router.push(`/products?q=${encodeURIComponent(trimmed)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (results.length > 0 && active >= 0) navigate(results[active].slug);
      else submitAll();
      return;
    }
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full min-w-0">
      {/* Reference-styled search pill (.h-search from theme.css): grey pill
          that lights up red on focus, with the uppercase SEARCH button. */}
      <form
        onSubmit={(e) => { e.preventDefault(); submitAll(); }}
        role="search"
        aria-label="Site search"
        className="h-search"
      >
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search by part name, OEM, SKU or bike model…"
          autoComplete="off"
        />
        <button type="submit" aria-label="Search">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </button>
      </form>

      {/* Autocomplete dropdown — anchored under the input. Only renders
          when there's a query of ≥2 chars and the input is focused / has
          been interacted with. */}
      {dropdownOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.25)]">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-red" />
          {results.length === 0 && !loading ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center text-sm text-muted-foreground">
              <Package className="h-5 w-5 opacity-50" />
              No results for &ldquo;{trimmed}&rdquo;.
              <button
                type="button"
                onClick={submitAll}
                className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-bold text-red"
              >
                Browse all products <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              <ul className="max-h-[420px] overflow-y-auto py-1">
                {results.map((r, i) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => navigate(r.slug)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition",
                        i === active ? "bg-soft" : "hover:bg-soft",
                      )}
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-line bg-soft">
                        {r.image && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={r.image} alt="" className="h-full w-full object-contain bg-white" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold text-ink">{r.name}</div>
                        <div className="truncate text-[12px] text-muted-foreground">
                          {r.brand} · {r.category}
                          {r.sku && <> · SKU {r.sku}</>}
                          {r.oemNumber && <> · OEM {r.oemNumber}</>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[13px] font-bold tabular-nums text-ink">
                          {fmtMoney(Number(r.price))}
                        </div>
                        <div className={cn(
                          "text-[11px] tabular-nums",
                          r.stock === 0 ? "text-red" : "text-muted-foreground",
                        )}>
                          {r.stock === 0 ? "Out of stock" : `${r.stock} in stock`}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              {total > results.length && (
                <button
                  type="button"
                  onClick={submitAll}
                  className="flex w-full items-center justify-between gap-2 border-t border-line bg-soft px-3 py-2 text-[13px] font-semibold text-ink transition hover:text-red"
                >
                  <span>See all {total} results</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
