"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Lightweight types so callers can pass whatever extra fields they want on
// each product — only the keys we read below are required.
export type FinderProduct = {
  id: string;
  name: string;
  sku?: string | null;
  oemNumber?: string | null;
  price?: number;
  cost?: number | null;
  stock?: number;
  image?: string | null;
  brandId: string;
  brandName: string;
  // Nullable for orphaned products (category soft-deleted). UI renders
  // "Uncategorised" in `categoryName` and skips the category-id filter.
  categoryId: string | null;
  categoryName: string;
  // Compatibility rows attached to this product. Empty array means no fitments
  // are explicitly attached — the product is treated as universal/unknown so
  // it isn't filtered out by a Brand-only filter, but model/year filters do
  // need a match.
  fitments: { bikeModelId: string; yearFrom: number; yearTo: number }[];
};

export type FinderBrand    = { id: string; name: string };
export type FinderCategory = { id: string; name: string };
export type FinderModel    = {
  id: string;
  name: string;
  brandId: string;
  yearStart: number;
  yearEnd: number;
};

const ANY = "__any__";

export function AdminProductFinder({
  products, brands, categories, models,
  onAdd,
  renderRow,
  initialLimit = 15,
}: {
  products: FinderProduct[];
  brands: FinderBrand[];
  categories: FinderCategory[];
  models: FinderModel[];
  onAdd: (p: FinderProduct) => void;
  /** Optional row renderer — caller can replace the default row layout. */
  renderRow?: (p: FinderProduct, add: () => void) => React.ReactNode;
  /** How many results to show when no filter is active. */
  initialLimit?: number;
}) {
  const [q, setQ]                   = useState("");
  const [brandId, setBrandId]       = useState<string>(ANY);
  const [categoryId, setCategoryId] = useState<string>(ANY);
  const [modelId, setModelId]       = useState<string>(ANY);
  const [year, setYear]             = useState<string>(ANY);

  // Constrain the models dropdown to the selected brand, and the years
  // dropdown to the selected model's year range.
  const filteredModels = useMemo(
    () => brandId === ANY ? models : models.filter((m) => m.brandId === brandId),
    [brandId, models],
  );
  const selectedModel = useMemo(
    () => modelId === ANY ? null : models.find((m) => m.id === modelId) ?? null,
    [modelId, models],
  );
  const years = useMemo(() => {
    if (!selectedModel) return [];
    const out: number[] = [];
    for (let y = selectedModel.yearEnd; y >= selectedModel.yearStart; y--) out.push(y);
    return out;
  }, [selectedModel]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const ynum = year !== ANY ? Number(year) : null;

    const matched = products.filter((p) => {
      if (brandId !== ANY && p.brandId !== brandId) return false;
      if (categoryId !== ANY && p.categoryId !== categoryId) return false;
      if (modelId !== ANY) {
        const fits = p.fitments.some((f) => {
          if (f.bikeModelId !== modelId) return false;
          if (ynum != null && !(f.yearFrom <= ynum && f.yearTo >= ynum)) return false;
          return true;
        });
        if (!fits) return false;
      }
      if (s) {
        const hay =
          `${p.name} ${p.sku ?? ""} ${p.oemNumber ?? ""} ${p.brandName} ${p.categoryName}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });

    const anyFilter = s || brandId !== ANY || categoryId !== ANY || modelId !== ANY;
    return anyFilter ? matched.slice(0, 40) : matched.slice(0, initialLimit);
  }, [products, q, brandId, categoryId, modelId, year, initialLimit]);

  // Reset child filters when parents change so impossible combinations clear.
  const onBrandChange = (v: string) => {
    setBrandId(v);
    if (modelId !== ANY && !models.find((m) => m.id === modelId && (v === ANY || m.brandId === v))) {
      setModelId(ANY);
      setYear(ANY);
    }
  };
  const onModelChange = (v: string) => {
    setModelId(v);
    setYear(ANY);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, SKU, OEM, brand…"
            className="h-9 pl-8"
          />
        </div>
        <Select value={brandId} onValueChange={onBrandChange}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All brands</SelectItem>
            {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={modelId} onValueChange={onModelChange}>
          <SelectTrigger className="h-9 w-[180px]" disabled={filteredModels.length === 0}>
            <SelectValue placeholder={filteredModels.length === 0 ? "No models" : "Bike model"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any model</SelectItem>
            {filteredModels.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name} ({m.yearStart}–{m.yearEnd})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-9 w-[110px]" disabled={!selectedModel}>
            <SelectValue placeholder={selectedModel ? "Any year" : "Year"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any year</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        {filtered.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No products match these filters.
          </p>
        ) : filtered.map((p) =>
          renderRow ? (
            <div key={p.id}>{renderRow(p, () => onAdd(p))}</div>
          ) : (
            <DefaultRow key={p.id} p={p} onAdd={() => onAdd(p)} />
          ),
        )}
      </div>
    </div>
  );
}

function DefaultRow({ p, onAdd }: { p: FinderProduct; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-border p-2">
      {p.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image} alt={p.name} className="h-10 w-10 shrink-0 rounded border border-border object-cover" />
      ) : (
        <div className="h-10 w-10 shrink-0 rounded border border-border bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{p.name}</div>
        <div className="text-[11px] text-muted-foreground">
          {p.brandName} · {p.categoryName}
          {p.sku && <> · SKU {p.sku}</>}
          {typeof p.stock === "number" && <> · {p.stock} in stock</>}
        </div>
      </div>
      <div className="text-right text-sm tabular-nums">
        {typeof p.price === "number" && <div>{fmtMoney(p.price)}</div>}
        {p.cost != null && (
          <div className="text-[11px] text-muted-foreground">Cost: {fmtMoney(p.cost)}</div>
        )}
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onAdd}>
        <Plus className="h-3.5 w-3.5" /> Add
      </Button>
    </div>
  );
}
