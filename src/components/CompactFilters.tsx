"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

type Brand = { id: string; name: string; slug: string };
type Category = { id: string; name: string; slug: string };
type BikeModel = {
  id: string;
  name: string;
  brandId: string;
  yearStart: number;
  yearEnd: number;
  brand: { name: string; slug: string };
};

// Compact horizontal filter row for the /products page.
// Shows only the bike fitment filters: Brand · Model · Year.
// (Category is removed — it's already encoded in the URL/page heading;
// sort/search/category are available elsewhere in the UI.)

export function CompactFilters({
  brands,
  models,
  categories = [],
}: {
  brands: Brand[];
  models: BikeModel[];
  categories?: Category[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const categorySlug = searchParams.get("category") ?? "";
  const brandSlug = searchParams.get("brand") ?? "";
  const modelId   = searchParams.get("model") ?? "";
  const year      = searchParams.get("year")  ?? "";
  const q         = searchParams.get("q")     ?? "";

  // Local input state for the search box, kept in sync with the URL.
  // Debounced push so we don't fire a request on every keystroke.
  const [qInput, setQInput] = useState(q);
  useEffect(() => { setQInput(q); }, [q]);
  useEffect(() => {
    if (qInput === q) return;
    const t = setTimeout(() => pushUrl({ q: qInput || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.slug === categorySlug),
    [categorySlug, categories],
  );

  const filteredModels = useMemo(
    () => (brandSlug ? models.filter((m) => m.brand.slug === brandSlug) : models),
    [brandSlug, models],
  );
  const selectedBrand = useMemo(
    () => brands.find((b) => b.slug === brandSlug),
    [brandSlug, brands],
  );
  const selectedModel = useMemo(
    () => models.find((m) => m.id === modelId),
    [modelId, models],
  );
  // Year dropdown shows the model's full range as a single combined option
  // (e.g. "2020–2022"), not one row per year. Selecting it scopes the filter
  // to that range; the server treats a "yyyy-yyyy" value as overlap matching.
  const yearRangeValue = selectedModel
    ? `${selectedModel.yearStart}-${selectedModel.yearEnd}`
    : "";
  const yearRangeLabel = selectedModel
    ? `${selectedModel.yearStart}–${selectedModel.yearEnd}`
    : "";

  const pushUrl = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
      router.refresh();
    });
  };

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    params.delete("brand");
    params.delete("model");
    params.delete("year");
    params.delete("q");
    const qs = params.toString();
    startTransition(() => {
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
      router.refresh();
    });
  };

  const anyActive = !!(categorySlug || brandSlug || modelId || year || q);
  const noBrands = brands.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search within current filters */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder={
            selectedBrand || selectedModel
              ? `Search in ${selectedModel?.name ?? selectedBrand?.name} parts…`
              : "Search parts by name, OEM, SKU…"
          }
          className="w-full rounded-full border border-border bg-card py-2 pl-8 pr-8 text-sm outline-none transition focus:border-primary/50"
        />
        {qInput && (
          <button
            type="button"
            onClick={() => setQInput("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Category */}
      <FilterChip
        label="Category"
        value={selectedCategory?.name}
        clearable={!!categorySlug}
        onClear={() => pushUrl({ category: null })}
        disabled={categories.length === 0}
      >
        <List
          searchable
          items={[
            { value: "", label: "All categories" },
            ...categories.map((c) => ({ value: c.slug, label: c.name })),
          ]}
          selected={categorySlug}
          onSelect={(v) => pushUrl({ category: v || null })}
          empty="No categories yet"
        />
      </FilterChip>

      {/* Brand */}
      <FilterChip
        label="Brand"
        value={selectedBrand?.name}
        clearable={!!brandSlug}
        onClear={() => pushUrl({ brand: null, model: null, year: null })}
        disabled={noBrands}
      >
        <List
          searchable
          items={[
            { value: "", label: "All brands" },
            ...brands.map((b) => ({ value: b.slug, label: b.name })),
          ]}
          selected={brandSlug}
          onSelect={(v) => pushUrl({ brand: v || null, model: null, year: null })}
          empty="No brands yet"
        />
      </FilterChip>

      {/* Model */}
      <FilterChip
        label="Model"
        value={selectedModel?.name}
        clearable={!!modelId}
        onClear={() => pushUrl({ model: null, year: null })}
        disabled={filteredModels.length === 0}
        hint={!brandSlug ? "Pick a brand first" : undefined}
      >
        <List
          searchable
          items={[
            { value: "", label: "Any model" },
            ...filteredModels.map((m) => ({
              value: m.id,
              label: brandSlug ? m.name : `${m.brand.name} ${m.name}`,
            })),
          ]}
          selected={modelId}
          onSelect={(v) => pushUrl({ model: v || null, year: null })}
          empty="No models for this brand"
        />
      </FilterChip>

      {/* Year */}
      <FilterChip
        label="Year"
        value={year ? (year.includes("-") ? year.replace("-", "–") : year) : undefined}
        clearable={!!year}
        onClear={() => pushUrl({ year: null })}
        disabled={!selectedModel}
        hint={!selectedModel ? "Pick a model first" : undefined}
      >
        <List
          items={[
            { value: "", label: "Any year" },
            ...(yearRangeValue
              ? [{ value: yearRangeValue, label: yearRangeLabel }]
              : []),
          ]}
          selected={year}
          onSelect={(v) => pushUrl({ year: v || null })}
          empty="No years available"
        />
      </FilterChip>

      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}

      {anyActive && (
        <button
          type="button"
          onClick={clearAll}
          className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      )}
    </div>
  );
}

// --- Filter chip: small pill button with a popover list ---------------------

function FilterChip({
  label, value, clearable, onClear, children, disabled, hint,
}: {
  label: string;
  value?: string;
  clearable: boolean;
  onClear: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border bg-card transition",
        value ? "border-primary/40 text-foreground" : "border-border text-muted-foreground",
        disabled && "opacity-50",
      )}
    >
      <Popover open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm disabled:cursor-not-allowed"
            aria-label={hint ?? `${label} filter`}
            title={hint}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-60">
              {label}
            </span>
            <span className="text-[14px] font-medium text-foreground">
              {value ?? (hint ? "—" : "Any")}
            </span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-1"
          onClick={() => setOpen(false)}
        >
          {children}
        </PopoverContent>
      </Popover>
      {clearable && (
        <button
          type="button"
          onClick={onClear}
          className="mr-1.5 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={`Clear ${label.toLowerCase()}`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

function List({
  items, selected, onSelect, empty, searchable,
}: {
  items: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
  empty: string;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState("");
  if (items.length <= 1) {
    return <div className="px-3 py-2 text-xs text-muted-foreground">{empty}</div>;
  }
  // "All/Any" item is always shown; the rest are filtered by query.
  const filtered = query
    ? [
        items[0],
        ...items.slice(1).filter((it) =>
          it.label.toLowerCase().includes(query.toLowerCase()),
        ),
      ]
    : items;
  return (
    <div className="flex flex-col">
      {searchable && (
        <div
          className="relative px-1.5 pt-1.5 pb-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full rounded border border-border bg-background py-1.5 pl-7 pr-2 text-sm outline-none focus:border-primary/50"
          />
        </div>
      )}
      <ul className="max-h-[260px] overflow-y-auto">
        {filtered.length === 1 && query ? (
          <li className="px-3 py-2 text-xs text-muted-foreground">No matches</li>
        ) : (
          filtered.map((it) => {
            const isActive = it.value === selected;
            return (
              <li key={it.value || "any"}>
                <button
                  type="button"
                  onClick={() => onSelect(it.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-sm transition",
                    isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span>{it.label}</span>
                  {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
