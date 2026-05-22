import Link from "next/link";
import { redirect } from "next/navigation";
import { PackageX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { CompactFilters } from "@/components/CompactFilters";
import { CategorySidebar } from "@/components/CategorySidebar";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";
import { getTradeContext, tradePrice } from "@/lib/trade-pricing";
import { getNavData } from "@/lib/nav-cache";
import { getAncestors, countMatchingProductsBySubtree } from "@/lib/category-tree";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Prisma } from "@prisma/client";

// Always render fresh — searchParams make this route dynamic, and we want
// filter changes to reflect new admin-added products immediately.
export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const categorySlug = typeof sp.category === "string" ? sp.category : undefined;

  // Legacy `/products?category=<slug>` URLs predate the tree route. Resolve
  // the slug to its current path and 301 to /category/<path>.
  if (categorySlug) {
    const target = await prisma.category.findFirst({
      where: { OR: [{ slug: categorySlug }, { path: categorySlug }] },
      select: { path: true },
      orderBy: { depth: "asc" },
    });
    if (target) {
      const extra = new URLSearchParams();
      for (const [k, v] of Object.entries(sp)) {
        if (k === "category") continue;
        if (typeof v === "string") extra.set(k, v);
      }
      const qs = extra.toString();
      redirect(`/category/${target.path}${qs ? `?${qs}` : ""}`);
    }
  }

  const brandSlug = typeof sp.brand === "string" ? sp.brand : undefined;
  const modelId = typeof sp.model === "string" ? sp.model : undefined;
  const yearStr = typeof sp.year === "string" ? sp.year : undefined;
  // year may be a single year ("2021") or a range ("2020-2022"). For a range
  // we match products whose compatibility window overlaps the range.
  let yearSingle: number | undefined;
  let yearRange: { from: number; to: number } | undefined;
  if (yearStr) {
    const m = /^(\d{4})-(\d{4})$/.exec(yearStr);
    if (m) yearRange = { from: Number(m[1]), to: Number(m[2]) };
    else if (/^\d{4}$/.test(yearStr)) yearSingle = Number(yearStr);
  }
  const q = typeof sp.q === "string" ? sp.q : undefined;

  const where: Prisma.ProductWhereInput = { active: true };
  const and: Prisma.ProductWhereInput[] = [];
  if (categorySlug) where.category = { slug: categorySlug };
  if (brandSlug) where.brand = { slug: brandSlug };
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { oemNumber: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (modelId) {
    // Fallback: if no fitments are attached to a product, fall back to a
    // brand match against the selected bike model's brand. This lets newly
    // added products surface under a Brand/Model filter before an admin has
    // wired up explicit compatibility rows.
    const selectedModel = await prisma.bikeModel.findUnique({
      where: { id: modelId },
      select: { brandId: true },
    });
    and.push({
      OR: [
        {
          compatibilities: {
            some: {
              bikeModelId: modelId,
              ...(yearSingle
                ? { yearFrom: { lte: yearSingle }, yearTo: { gte: yearSingle } }
                : yearRange
                  ? { yearFrom: { lte: yearRange.to }, yearTo: { gte: yearRange.from } }
                  : {}),
            },
          },
        },
        ...(selectedModel
          ? [
              {
                compatibilities: { none: {} },
                brandId: selectedModel.brandId,
              } satisfies Prisma.ProductWhereInput,
            ]
          : []),
      ],
    });
  }
  if (and.length) where.AND = and;

  // Brands / categories / models come from the 5-minute shared cache that the
  // header already populates — saves three duplicate queries per page render.
  const [trade, nav, products, activeCategory, activeBrand] = await Promise.all([
    getTradeContext(),
    getNavData(),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        brand: true,
        category: true,
        compatibilities: {
          include: { bikeModel: { include: { brand: true } } },
          take: 4,
        },
      },
      take: 60,
    }),
    categorySlug
      ? prisma.category.findFirst({
          where: { OR: [{ path: categorySlug }, { slug: categorySlug }] },
          select: { name: true, description: true },
          orderBy: { depth: "asc" },
        })
      : null,
    brandSlug
      ? prisma.brand.findUnique({ where: { slug: brandSlug }, select: { name: true } })
      : null,
  ]);
  const brands = nav.brands;
  const allCategories = nav.categories;
  // CompactFilters expects each model to carry its brand's name+slug — enrich
  // the lean cached models with the brand we already have in `nav.brands`.
  const brandById = new Map(brands.map((b) => [b.id, { name: b.name, slug: b.slug }]));
  const allModels = nav.models.map((m) => ({
    ...m,
    brand: brandById.get(m.brandId) ?? { name: "", slug: "" },
  }));

  const heading = activeCategory?.name
    ? `${activeCategory.name} parts`
    : activeBrand?.name
      ? `${activeBrand.name} parts`
      : q
        ? `Search · "${q}"`
        : "Spare parts";

  // Active category's ancestor chain — drives both the sidebar's
  // highlight/auto-expand and the multi-level breadcrumb at the top.
  const activeCategoryNode = categorySlug
    ? await prisma.category.findFirst({
        where: { OR: [{ path: categorySlug }, { slug: categorySlug }] },
        select: { id: true, path: true },
        orderBy: { depth: "asc" },
      })
    : null;
  const ancestors = activeCategoryNode
    ? await getAncestors(activeCategoryNode.id)
    : [];

  // Available sub-category strip: when the customer narrows by brand /
  // model / year / q without picking a category, we surface every
  // top-level category that contains at least one matching product. Lets
  // them drill into a specific area without going back to "all".
  const showSubcategoryChips = !activeCategoryNode && (brandSlug || modelId || q);
  const subcategoryChips = showSubcategoryChips
    ? await (async () => {
        const candidates = nav.tree.map((n) => ({ id: n.id, name: n.name, path: n.path }));
        const counts = await countMatchingProductsBySubtree(candidates, where);
        return candidates
          .map((c) => ({ ...c, count: counts.get(c.path) ?? 0 }))
          .filter((c) => c.count > 0);
      })()
    : [];

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-site px-[var(--gutter)] py-6 lg:py-8">
        <Breadcrumbs
          className="mb-3"
          items={(() => {
            const out: Crumb[] = [{ label: "Products", href: "/products" }];
            // Ancestor chain — every ancestor up to the selection's parent is
            // a link; the deepest one (the active category) is plain text.
            for (let i = 0; i < ancestors.length; i++) {
              const a = ancestors[i];
              const last = i === ancestors.length - 1;
              out.push({ label: a.name, href: last ? undefined : `/category/${a.path}` });
            }
            if (!ancestors.length && activeBrand) {
              out.push({ label: activeBrand.name });
            }
            return out;
          })()}
        />

        <div className="flex gap-6">
          <CategorySidebar tree={nav.tree} selectedPath={activeCategoryNode?.path ?? null} />

          <div className="min-w-0 flex-1">
            {/* Header */}
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{heading}</h1>
                {activeCategory?.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{activeCategory.description}</p>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{products.length}</span>{" "}
                {products.length === 1 ? "result" : "results"}
              </div>
            </div>

            {/* Compact filter bar — Category · Brand · Model · Year */}
            <div className="mb-5 border-y border-border py-3">
              <CompactFilters brands={brands} models={allModels} categories={allCategories} />
            </div>

            {/* Drill-in chips: shown when the customer has filtered by
                brand/model/year/q without picking a category. Each chip leads
                into the matching top-level category so they can narrow further. */}
            {subcategoryChips.length > 0 && (
              <div className="mb-5">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Narrow by category
                </div>
                <div className="flex flex-wrap gap-2">
                  {subcategoryChips.map((c) => {
                    const params = new URLSearchParams();
                    if (brandSlug) params.set("brand", brandSlug);
                    if (modelId) params.set("model", modelId);
                    if (yearStr) params.set("year", yearStr);
                    if (q) params.set("q", q);
                    const qs = params.toString();
                    return (
                      <Link
                        key={c.id}
                        href={`/category/${c.path}${qs ? `?${qs}` : ""}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground/85 transition hover:border-primary/40 hover:bg-accent hover:text-foreground"
                      >
                        {c.name}
                        <span className="text-[11px] text-muted-foreground">{c.count}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Grid */}
            {products.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-3 p-16 text-center">
                  <PackageX className="h-10 w-10 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No parts match these filters</h3>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Try changing your bike or browse all parts.
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-2">
                    <Link href={categorySlug ? `/products?category=${categorySlug}` : "/products"}>
                      {categorySlug ? "Reset filters in this category" : "Clear all filters"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {products.map((p) => {
                  const tp = tradePrice(Number(p.price), p.categoryId, trade);
                  return (
                    <ProductCard
                      key={p.id}
                      p={{
                        id: p.id,
                        slug: p.slug,
                        name: p.name,
                        price: p.price.toString(),
                        stock: p.stock,
                        images: p.images,
                        brand: p.brand,
                        category: p.category,
                        oemNumber: p.oemNumber,
                        sku: p.sku,
                        fitments: p.compatibilities.map((c) => ({
                          brand: c.bikeModel.brand.name,
                          model: c.bikeModel.name,
                          yearFrom: c.yearFrom,
                          yearTo: c.yearTo,
                        })),
                        tradePrice: tp.percent > 0
                          ? { discounted: tp.discounted, percent: tp.percent }
                          : undefined,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
