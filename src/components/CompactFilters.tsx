"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

type Brand = { id: string; name: string; slug: string };
// Tree-shaped — we render the dropdown with depth-based indentation and use
// the full `path` as the value so picking a parent category like "brake"
// rolls up products from every descendant. `count` is the rolled-up active-
// product total, used to hide empty branches.
type Category = {
  id: string;
  name: string;
  slug: string;
  path: string;
  depth: number;
  parentId: string | null;
  count: number;
};
type BikeModel = {
  id: string;
  name: string;
  brandId: string;
  yearStart: number;
  yearEnd: number;
  brand: { name: string; slug: string };
};

// Horizontal filter row shown above the product grid. Hosts Category +
// Brand + Model + Year + a free-text search. Pure URL-driven: every chip
// pushes a search-param patch and refreshes the server-rendered grid.
// Picking a category navigates to /category/<path> directly so the route
// can do descendant rollup; everything else stays on the current pathname.

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

  // On /category/<path>, the active category lives in the URL pathname, not
  // in `?category=`. Surface it to the chip so the label reads correctly and
  // the dropdown opens with the current node highlighted.
  const pathBasedCategoryPath = useMemo(() => {
    if (!pathname?.startsWith("/category/")) return "";
    return decodeURIComponent(pathname.slice("/category/".length));
  }, [pathname]);
  const queryCategory = searchParams.get("category") ?? "";
  const activeCategoryValue = pathBasedCategoryPath || queryCategory;

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
    () =>
      categories.find((c) => c.path === activeCategoryValue) ??
      categories.find((c) => c.slug === activeCategoryValue),
    [activeCategoryValue, categories],
  );

  // Pre-sort the tree depth-first so every child appears under its parent
  // in the dropdown. Indentation is driven by `depth`.
  const orderedCategories = useMemo(() => {
    const byParent = new Map<string | null, Category[]>();
    for (const c of categories) {
      const arr = byParent.get(c.parentId) ?? [];
      arr.push(c);
      byParent.set(c.parentId, arr);
    }
    for (const arr of byParent.values()) arr.sort((a, b) => a.name.localeCompare(b.name));
    const out: Category[] = [];
    const walk = (parentId: string | null) => {
      for (const node of byParent.get(parentId) ?? []) {
        out.push(node);
        walk(node.id);
      }
    };
    walk(null);
    return out;
  }, [categories]);

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
  const yearRangeValue = selectedModel
    ? `${selectedModel.yearStart}-${selectedModel.yearEnd}`
    : "";
  const yearRangeLabel = selectedModel
    ? `${selectedModel.yearStart}–${selectedModel.yearEnd}`
    : "";

  // Generic search-param patch — used by brand/model/year/q. Stays on the
  // current pathname.
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

  // Category change is special — it switches the route. Picking a path
  // sends you to /category/<path>; picking "all categories" sends you back
  // to /products. Other filters (brand/model/year/q) come along for the ride.
  const setCategory = (path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    const qs = params.toString();
    const target = path ? `/category/${path}` : "/products";
    startTransition(() => {
      router.push(`${target}${qs ? `?${qs}` : ""}`, { scroll: false });
      router.refresh();
    });
  };

  const clearAll = () => {
    // Wipe every filter param AND drop back to /products (the canonical
    // "no category selected" surface) so the user has a clean slate.
    startTransition(() => {
      router.push("/products", { scroll: false });
      router.refresh();
    });
  };

  const anyActive = !!(activeCategoryValue || brandSlug || modelId || year || q);
  const noBrands = brands.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Search within current filters */}
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder={
            selectedBrand || selectedModel
              ? `Search in ${selectedModel?.name ?? selectedBrand?.name} parts…`
              : "Search parts by name, OEM, SKU…"
          }
          className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-9 text-[15px] outline-none transition focus:border-primary/50"
        />
        {qInput && (
          <button
            type="button"
            onClick={() => setQInput("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Category — full tree, indented by depth. Value is the path so the
          server can roll up products from every descendant. */}
      <FilterChip
        label="Category"
        value={selectedCategory?.name}
        clearable={!!activeCategoryValue}
        onClear={() => setCategory("")}
        disabled={orderedCategories.length === 0}
      >
        <List
          searchable
          items={[
            { value: "", label: "All categories", depth: 0 },
            ...orderedCategories.map((c) => ({
              value: c.path,
              label: c.name,
              depth: c.depth,
            })),
          ]}
          selected={selectedCategory?.path ?? ""}
          onSelect={(v) => setCategory(v)}
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
              label: `${brandSlug ? m.name : `${m.brand.name} ${m.name}`} (${m.yearStart}–${m.yearEnd})`,
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

      {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

      {anyActive && (
        <button
          type="button"
          onClick={clearAll}
          className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      )}
    </div>
  );
}

// --- Filter chip: pill button with a popover list --------------------------

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
        value ? "border-primary/50 text-foreground" : "border-border text-muted-foreground",
        disabled && "opacity-50",
      )}
    >
      <Popover open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="flex h-11 items-center gap-2 px-4 text-sm disabled:cursor-not-allowed"
            aria-label={hint ?? `${label} filter`}
            title={hint}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">
              {label}
            </span>
            <span className="text-[15px] font-medium text-foreground">
              {value ?? (hint ? "—" : "Any")}
            </span>
            <ChevronDown className="h-4 w-4 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="min-w-[260px] p-1"
          onClick={() => setOpen(false)}
        >
          {children}
        </PopoverContent>
      </Popover>
      {clearable && (
        <button
          type="button"
          onClick={onClear}
          className="mr-2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={`Clear ${label.toLowerCase()}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function List({
  items, selected, onSelect, empty, searchable,
}: {
  items: { value: string; label: string; depth?: number }[];
  selected: string;
  onSelect: (v: string) => void;
  empty: string;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState("");
  if (items.length <= 1) {
    return <div className="px-3 py-2 text-sm text-muted-foreground">{empty}</div>;
  }
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
            className="w-full rounded border border-border bg-background py-2 pl-7 pr-2 text-sm outline-none focus:border-primary/50"
          />
        </div>
      )}
      <ul className="max-h-[300px] overflow-y-auto">
        {filtered.length === 1 && query ? (
          <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>
        ) : (
          filtered.map((it) => {
            const isActive = it.value === selected;
            const depth = it.depth ?? 0;
            return (
              <li key={it.value || "any"}>
                <button
                  type="button"
                  onClick={() => onSelect(it.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded py-2 pr-2.5 text-left text-sm transition",
                    isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                  style={{ paddingLeft: 12 + depth * 14 }}
                >
                  <span className="truncate">{it.label}</span>
                  {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
