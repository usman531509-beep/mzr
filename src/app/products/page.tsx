import Link from "next/link";
import { PackageX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { CompactFilters } from "@/components/CompactFilters";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";
import { getTradeContext, tradePrice } from "@/lib/trade-pricing";
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

  const trade = await getTradeContext();
  const [products, brands, allModels, allCategories, activeCategory, activeBrand] = await Promise.all([
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
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.bikeModel.findMany({
      orderBy: [{ brandId: "asc" }, { name: "asc" }],
      include: { brand: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    categorySlug ? prisma.category.findUnique({ where: { slug: categorySlug } }) : null,
    brandSlug ? prisma.brand.findUnique({ where: { slug: brandSlug } }) : null,
  ]);

  const heading = activeCategory?.name
    ? `${activeCategory.name} parts`
    : activeBrand?.name
      ? `${activeBrand.name} parts`
      : q
        ? `Search · "${q}"`
        : "Spare parts";

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-site px-[var(--gutter)] py-6 lg:py-8">
        <Breadcrumbs
          className="mb-3"
          items={(() => {
            const out: Crumb[] = [{ label: "Products", href: "/products" }];
            if (activeCategory) out.push({ label: activeCategory.name });
            else if (activeBrand) out.push({ label: activeBrand.name });
            return out;
          })()}
        />

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

        {/* Compact filter bar — Brand · Model · Year only */}
        <div className="mb-5 border-y border-border py-2.5">
          <CompactFilters brands={brands} models={allModels} categories={allCategories} />
        </div>

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
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
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
  );
}
