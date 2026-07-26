"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, Package, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtMoney } from "@/lib/format";

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

const HINTS = ["Brake pads", "Piston", "Tyre", "Headlight", "Battery"];

export function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  // Auto-focus input when overlay opens.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  // Reset when closed so reopening starts blank.
  useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
      setTotal(0);
      setActive(0);
    }
  }, [open]);

  // Debounced live search.
  useEffect(() => {
    if (!open) return;
    const trimmed = q.trim();
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
  }, [q, open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [open]);

  // Keyboard handling: ↑↓ to navigate, Enter to go, Esc to close.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (results.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + results.length) % results.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const r = results[active];
        if (r) navigate(r.slug);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, results, active]);

  const navigate = (slug: string) => {
    onClose();
    router.push(`/products/${slug}`);
  };

  const seeAll = () => {
    onClose();
    router.push(`/products?q=${encodeURIComponent(q.trim())}`);
  };

  if (!open) return null;

  const trimmed = q.trim();
  const showEmpty = trimmed.length >= 2 && !loading && results.length === 0;
  const showHints = trimmed.length < 2;

  return (
    <div
      className="fixed inset-0 z-[9500] bg-ink/40"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div className="flex min-h-screen items-start justify-center px-4 pt-20 sm:pt-24">
        <div
          className="w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-white shadow-[0_24px_60px_-10px_rgba(11,13,18,0.25)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Input */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, OEM number, SKU, brand…"
              className="h-10 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
            {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto">
            {showHints && (
              <div className="p-5">
                <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Try searching for
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {HINTS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setQ(h)}
                      className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                    >
                      {h}
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-[12.5px] text-muted-foreground">
                  Type a part name, brand, OEM number, or SKU. Use <Kbd>↑</Kbd> <Kbd>↓</Kbd> to navigate, <Kbd>Enter</Kbd> to open, <Kbd>Esc</Kbd> to close.
                </div>
              </div>
            )}

            {showEmpty && (
              <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
                <Package className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">No parts match "{trimmed}"</p>
                <p className="text-xs text-muted-foreground">Try a different keyword or browse the full catalogue.</p>
              </div>
            )}

            {results.length > 0 && (
              <ul role="listbox">
                {results.map((r, i) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => navigate(r.slug)}
                      className={cn(
                        "flex w-full items-center gap-3 border-b border-border/60 px-4 py-2.5 text-left transition",
                        i === active ? "bg-accent" : "hover:bg-accent/50",
                      )}
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-secondary">
                        {r.image && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={r.image} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[11.5px] uppercase tracking-wider text-muted-foreground">
                          <span>{r.brand}</span>
                          <span>·</span>
                          <span>{r.category}</span>
                        </div>
                        <div className="truncate text-[15px] font-medium">{r.name}</div>
                        {(r.oemNumber || r.sku) && (
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] font-mono text-muted-foreground">
                            {r.oemNumber && <span><span className="opacity-60">OEM</span> {r.oemNumber}</span>}
                            {r.sku       && <span><span className="opacity-60">SKU</span> {r.sku}</span>}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-[15px] font-semibold tabular-nums">{fmtMoney(r.price)}</div>
                        <div className={`text-[11.5px] ${r.stock > 0 ? "text-emerald-600" : "text-destructive"}`}>
                          {r.stock > 0 ? `${r.stock} in stock` : "Sold out"}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer: see all */}
          {results.length > 0 && (
            <button
              type="button"
              onClick={seeAll}
              className="flex w-full items-center justify-between gap-3 border-t border-line bg-soft px-4 py-3 text-sm text-ink transition hover:bg-accent"
            >
              <span>
                See all <strong>{total}</strong> result{total === 1 ? "" : "s"} for "{trimmed}"
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-border bg-background px-1 font-mono text-[10px] text-muted-foreground">
      {children}
    </kbd>
  );
}
