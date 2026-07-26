"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type FilterDef = {
  param: string;
  label: string;
  options: { value: string; label: string }[];
  /** Label shown for the "no filter" option (e.g. "All"). */
  any?: string;
};

const ANY = "__any__";

// Drop-in toolbar for admin list pages. Pushes search/filter changes to the
// URL (?q=… &<param>=…) so server components can read them and re-query the DB.
// On client-only pages (bike-models, brands, categories) the parent reads the
// same searchParams and filters the in-memory array.
export function AdminFilterBar({
  searchPlaceholder = "Search…",
  searchParam = "q",
  filters = [],
}: {
  searchPlaceholder?: string;
  searchParam?: string;
  filters?: FilterDef[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const initialQ = sp.get(searchParam) ?? "";
  const [q, setQ] = useState(initialQ);
  const [pending, setPending] = useState(false);

  useEffect(() => { setQ(sp.get(searchParam) ?? ""); }, [sp, searchParam]);

  // Debounced URL write for the search input.
  useEffect(() => {
    const current = sp.get(searchParam) ?? "";
    if (q === current) return;
    setPending(true);
    const t = setTimeout(() => {
      const params = new URLSearchParams(sp.toString());
      if (q) params.set(searchParam, q);
      else params.delete(searchParam);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      setPending(false);
    }, 300);
    return () => { clearTimeout(t); setPending(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const setFilter = (param: string, value: string) => {
    const params = new URLSearchParams(sp.toString());
    if (!value || value === ANY) params.delete(param);
    else params.set(param, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const anyActive = !!q || filters.some((f) => sp.get(f.param));

  const clearAll = () => {
    const params = new URLSearchParams(sp.toString());
    params.delete(searchParam);
    for (const f of filters) params.delete(f.param);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    // Reference `.toolbar`: white panel with bordered inputs/selects.
    <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-line bg-white p-3">
      <div className="relative min-w-[220px] flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 border-line bg-white pl-8 pr-8"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-soft hover:text-red"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {filters.map((f) => {
        const value = sp.get(f.param) ?? ANY;
        return (
          <Select key={f.param} value={value} onValueChange={(v) => setFilter(f.param, v)}>
            <SelectTrigger className="h-9 w-[160px] border-line bg-white">
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{f.any ?? `All ${f.label.toLowerCase()}`}</SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })}

      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}

      {anyActive && (
        <button
          type="button"
          onClick={clearAll}
          className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-red"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      )}
    </div>
  );
}
