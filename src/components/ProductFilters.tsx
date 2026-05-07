"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, RotateCcw, Filter, Loader2, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

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

const ANY = "__any__";

export function ProductFilters({
  brands,
  categories,
  models,
}: {
  brands: Brand[];
  categories: Category[];
  models: BikeModel[];
  // `initial` prop kept optional for backward compat; ignored — we read URL directly.
  initial?: unknown;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  // ── URL is the source of truth ──────────────────────────────────────────
  const brandSlug = searchParams.get("brand") ?? "";
  const modelId   = searchParams.get("model") ?? "";
  const year      = searchParams.get("year") ?? "";
  const category  = searchParams.get("category") ?? "";
  const sort      = searchParams.get("sort") ?? "new";
  const urlQ      = searchParams.get("q") ?? "";

  // Local state for the search input only (so we can debounce)
  const [q, setQ] = useState(urlQ);

  // Collapse state for mobile only — desktop is always expanded.
  const [mobileOpen, setMobileOpen] = useState(false);

  // Re-sync local search if URL changes from elsewhere (e.g. a category link
  // on the home page). This is what fixes the "stuck filter" bug.
  useEffect(() => { setQ(urlQ); }, [urlQ]);

  const filteredModels = useMemo(
    () => (brandSlug ? models.filter((m) => m.brand.slug === brandSlug) : models),
    [brandSlug, models],
  );
  const selectedModel = useMemo(
    () => models.find((m) => m.id === modelId),
    [modelId, models],
  );
  const years = useMemo(() => {
    if (!selectedModel) return [];
    const out: number[] = [];
    for (let y = selectedModel.yearEnd; y >= selectedModel.yearStart; y--) out.push(y);
    return out;
  }, [selectedModel]);

  // ── Single helper to push URL with arbitrary patches ────────────────────
  const pushUrl = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    // Drop default sort from URL so canonical /products has no junk params.
    if (params.get("sort") === "new") params.delete("sort");
    const qs = params.toString();
    const target = `${pathname}${qs ? `?${qs}` : ""}`;
    startTransition(() => {
      router.push(target, { scroll: false });
      // router.refresh() forces a fresh RSC fetch instead of reading from
      // Next's client-side router cache — without this, navigating back to
      // a previously-visited URL (e.g. /products with no category after
      // /products?category=tyres) shows the stale cached list.
      router.refresh();
    });
  };

  // ── Debounced search push ───────────────────────────────────────────────
  useEffect(() => {
    if (q === urlQ) return;
    const t = setTimeout(() => pushUrl({ q: q || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const onBrand = (v: string) => {
    // Clear dependent fields when brand changes.
    pushUrl({
      brand: v === ANY ? null : v,
      model: null,
      year:  null,
    });
  };
  const onModel = (v: string) => {
    pushUrl({ model: v === ANY ? null : v, year: null });
  };
  const onYear     = (v: string) => pushUrl({ year:     v === ANY ? null : v });
  const onCategory = (v: string) => pushUrl({ category: v === ANY ? null : v });
  const onSort     = (v: string) => pushUrl({ sort:     v === "new" ? null : v });

  const reset = () => {
    setQ("");
    startTransition(() => {
      router.push("/products", { scroll: false });
      router.refresh();
    });
  };

  const hasFilters =
    !!(brandSlug || modelId || year || category || urlQ || sort !== "new");

  // Count active filters for the mobile toggle pill.
  const activeCount = [brandSlug, modelId, year, category, urlQ].filter(Boolean).length
    + (sort !== "new" ? 1 : 0);

  return (
    <Card className="h-fit lg:sticky lg:top-20">
      {/* Mobile-only toggle header — desktop has no header */}
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 border-b border-border px-4 py-3 lg:hidden"
        aria-expanded={mobileOpen}
      >
        <span className="flex items-center gap-2 font-medium">
          <Filter className="h-4 w-4 text-primary" />
          Filters
          {activeCount > 0 && (
            <Badge variant="default" className="text-[10px]">{activeCount}</Badge>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", mobileOpen && "rotate-180")}
        />
      </button>

      <CardContent className={cn("p-5", !mobileOpen && "hidden lg:block")}>
        <div className="space-y-5">
          {/* Search */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="q">Search</Label>
              {pending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="q"
                placeholder="Brake pad, piston, OEM…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Separator />

          {/* Bike finder */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Find parts for your bike
              </h3>
            </div>

            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Brand</Label>
                <Select value={brandSlug || ANY} onValueChange={onBrand}>
                  <SelectTrigger><SelectValue placeholder="All brands" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>All brands</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.slug}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Model</Label>
                <Select
                  value={modelId || ANY}
                  onValueChange={onModel}
                  disabled={filteredModels.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={filteredModels.length === 0 ? "No models" : "Any model"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Any model</SelectItem>
                    {filteredModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {brandSlug ? m.name : `${m.brand.name} ${m.name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Year</Label>
                <Select
                  value={year || ANY}
                  onValueChange={onYear}
                  disabled={!selectedModel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedModel ? "Any year" : "Pick a model first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Any year</SelectItem>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Category</Label>
            <Select value={category || ANY} onValueChange={onCategory}>
              <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Sort</Label>
            <Select value={sort} onValueChange={onSort}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Newest</SelectItem>
                <SelectItem value="price-asc">Price: low → high</SelectItem>
                <SelectItem value="price-desc">Price: high → low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <>
              <Separator />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={reset}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear all filters
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
