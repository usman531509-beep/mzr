"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from "@/lib/format";
import {
  PartDialog, type Brand, type ProductBrand, type Category, type BikeModel,
} from "@/components/admin/PartDialog";

export type DashboardCategory = {
  id: string; name: string; slug: string;
  productCount: number;
  recent: { id: string; name: string; price: string; stock: number; image: string | null }[];
};

export type DashboardProduct = {
  id: string; name: string; slug: string;
  price: string; costPrice: string | null; stock: number;
  brand: string;
  // `category` / `categorySlug` are null when the product is currently
  // orphaned (its category was soft-deleted). Display fallbacks to
  // "Uncategorised" — admin can reassign in the edit dialog.
  category: string | null;
  categorySlug: string | null;
  featured: boolean; demanding: boolean; active: boolean;
  image: string | null;
  description: string;
  brandId: string;
  // Full set of compatible bike-brand ids. Always includes `brandId` so
  // PartDialog can hydrate every checkbox without a follow-up query.
  brandIds: string[];
  productBrandId: string | null;
  categoryId: string | null;
  // Snapshot of the previous categoryId set by the category DELETE handler
  // — kept on the wire so the admin UI can show a "pending rehome" hint.
  savedCategoryId: string | null;
  savedCategoryName: string | null;
  sku: string | null;
  oemNumber: string | null;
  images: string[];
  compatibilities: { bikeModelId: string; yearFrom: number; yearTo: number }[];
};

const ICON: Record<string, string> = {
  engine: "🔧", body: "🛠️", tyres: "🛞", brakes: "🛑", electrical: "⚡", suspension: "🪛",
};

// How many cards / rows to surface on the dashboard. The full lists live on
// /admin/categories and /admin/products — the dashboard is just an at-a-
// glance overview, not a workspace.
const CATEGORY_PREVIEW = 6;
const PRODUCT_PREVIEW = 10;

export function DashboardClient({
  categoriesData, products, brands, productBrands, categories, models,
}: {
  categoriesData: DashboardCategory[];
  products: DashboardProduct[];
  brands: Brand[];
  productBrands: ProductBrand[];
  categories: Category[];
  models: BikeModel[];
}) {
  const [open, setOpen] = useState(false);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | undefined>();

  // Cap to the previews; the full catalogue lives on dedicated admin pages.
  const previewCategories = categoriesData.slice(0, CATEGORY_PREVIEW);
  const previewProducts   = products.slice(0, PRODUCT_PREVIEW);
  const hiddenCategories  = Math.max(0, categoriesData.length - previewCategories.length);
  const hiddenProducts    = Math.max(0, products.length - previewProducts.length);

  const openNew = (categoryId?: string) => {
    setDefaultCategoryId(categoryId);
    setOpen(true);
  };

  return (
    <>
      {/* ── TOP CATEGORIES ────────────────────────────────────── */}
      <Card className="rounded-[10px] border-line shadow-none">
        <CardHeader className="flex-row items-end justify-between">
          <div>
            <CardTitle className="text-lg">Top categories</CardTitle>
            <CardDescription>
              {hiddenCategories > 0
                ? `Showing ${previewCategories.length} of ${categoriesData.length}. Manage the full tree on the categories page.`
                : "Every category in the catalogue."}
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/categories">
              View all categories <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {previewCategories.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No categories yet — create one on the categories page.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {previewCategories.map((c) => (
                <div key={c.id} className="rounded-[10px] border border-line bg-soft p-4 transition hover:border-red/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{ICON[c.slug] ?? "📦"}</span>
                        <h3 className="truncate text-sm font-semibold">{c.name}</h3>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {c.productCount} part{c.productCount === 1 ? "" : "s"}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openNew(c.id)}>
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center justify-end border-t border-line pt-2">
                    <Link
                      href={`/products?category=${c.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-red"
                    >
                      <ExternalLink className="h-3 w-3" /> View on store
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── RECENT PARTS ──────────────────────────────────────── */}
      <Card className="mt-6 rounded-[10px] border-line shadow-none">
        <CardHeader className="flex-row items-end justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Recent parts</CardTitle>
            <CardDescription>
              {hiddenProducts > 0
                ? `Latest ${previewProducts.length} of ${products.length} in the catalogue.`
                : "Every part in the catalogue."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => openNew()}>
              <Plus className="h-3.5 w-3.5" /> New part
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/products">
                View all parts <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {previewProducts.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No parts yet — add your first one above.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {previewProducts.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-border bg-muted">
                    {p.image && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.image} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/products?q=${encodeURIComponent(p.name)}`}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.featured && <Badge variant="warning" className="bg-[#fff4d6] text-gold text-[9px]">Featured</Badge>}
                      {p.demanding && <Badge className="bg-red-soft text-red ring-1 ring-inset ring-red/30 text-[9px] hover:bg-red-soft">In demand</Badge>}
                      {!p.active && <Badge variant="secondary" className="text-[9px]">Inactive</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.brand} · {p.category}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-medium tabular-nums">{fmtMoney(p.price)}</div>
                    <div className={`text-[11px] tabular-nums ${p.stock === 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      stock {p.stock}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <PartDialog
        open={open}
        onOpenChange={setOpen}
        brands={brands}
        productBrands={productBrands}
        categories={categories}
        models={models}
        defaultCategoryId={defaultCategoryId}
      />
    </>
  );
}
