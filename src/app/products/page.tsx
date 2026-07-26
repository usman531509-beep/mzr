import Link from "next/link";
import { PackageX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { CompactFilters } from "@/components/CompactFilters";
import { CategorySidebar } from "@/components/CategorySidebar";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";
import { getTradeContext, tradePrice } from "@/lib/trade-pricing";
import { getNavData } from "@/lib/nav-cache";
import { getAncestors, countMatchingProductsBySubtree } from "@/lib/category-tree";
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

  // `?category=…` accepts either a full path ("brake/brake-pads") or a bare
  // slug (legacy mega-menu links). Resolved here so the same /products route
  // handles "all products" + every category drill-in in one place — no full
  // page reload when the customer clicks around in the sidebar.
  const categoryParam = typeof sp.category === "string" ? sp.category : undefined;
  const activeCategoryNode = categoryParam
    ? await prisma.category.findFirst({
        where: {
          deletedAt: null,
          OR: [{ path: categoryParam }, { slug: categoryParam }],
        },
        select: {
          id: true, name: true, slug: true, path: true, description: true,
        },
        orderBy: { depth: "asc" },
      })
    : null;

  const brandSlug = typeof sp.brand === "string" ? sp.brand : undefined;
  const productBrandSlug = typeof sp.productBrand === "string" ? sp.productBrand : undefined;
  const modelId = typeof sp.model === "string" ? sp.model : undefined;
  const yearStr = typeof sp.year === "string" ? sp.year : undefined;
  let yearSingle: number | undefined;
  let yearRange: { from: number; to: number } | undefined;
  if (yearStr) {
    const m = /^(\d{4})-(\d{4})$/.exec(yearStr);
    if (m) yearRange = { from: Number(m[1]), to: Number(m[2]) };
    else if (/^\d{4}$/.test(yearStr)) yearSingle = Number(yearStr);
  }
  const q = typeof sp.q === "string" ? sp.q : undefined;

  const where: Prisma.ProductWhereInput = { active: true, deletedAt: null };
  const and: Prisma.ProductWhereInput[] = [];

  // Category filter: roll up to include the node itself + every descendant.
  // Products are leaf-only, so without rollup picking a parent returns nothing.
  if (activeCategoryNode) {
    and.push({
      OR: [
        { category: { path: activeCategoryNode.path } },
        { category: { path: { startsWith: `${activeCategoryNode.path}/` } } },
      ],
    });
  }
  // Multi-brand: a product with Honda + Yamaha + Kawasaki ticked should
  // appear under all three brand listings, not just its legacy primary
  // brandId. `brands: { some }` matches the M2M set which always includes
  // the primary, so this is a strict superset of the old `brand: { slug }`
  // filter.
  if (brandSlug) where.brands = { some: { slug: brandSlug } };
  if (productBrandSlug) where.productBrand = { slug: productBrandSlug };
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { oemNumber: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  // Model + year: strict matching only — a product must have an explicit
  // compatibility row for the chosen bike model (with year overlap when a
  // year is provided). The earlier brand-only fallback was returning Honda
  // CBR products when the customer asked for PCX 125 — surprising and wrong.
  if (modelId) {
    and.push({
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
    });
  }
  if (and.length) where.AND = and;

  // Brands / categories / models come from the shared 5-minute cache.
  const [trade, nav, products, activeBrand, ancestors, productBrands, activeProductBrand] = await Promise.all([
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
    brandSlug
      ? prisma.brand.findUnique({ where: { slug: brandSlug }, select: { name: true } })
      : null,
    activeCategoryNode ? getAncestors(activeCategoryNode.id) : Promise.resolve([]),
    // Product brands are a tiny table (Brembo, NGK, EBC…) — uncached fetch
    // is fine and lets us add new ones without waiting for nav-cache TTL.
    prisma.productBrand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    productBrandSlug
      ? prisma.productBrand.findUnique({ where: { slug: productBrandSlug }, select: { name: true } })
      : null,
  ]);
  const brands = nav.brands;
  const allCategories = nav.categories;
  const brandById = new Map(brands.map((b) => [b.id, { name: b.name, slug: b.slug }]));
  const allModels = nav.models.map((m) => ({
    ...m,
    brand: brandById.get(m.brandId) ?? { name: "", slug: "" },
  }));

  const heading = activeCategoryNode?.name
    ? `${activeCategoryNode.name} parts`
    : activeBrand?.name
      ? `${activeBrand.name} parts`
      : activeProductBrand?.name
        ? `${activeProductBrand.name} parts`
        : q
          ? `Search · "${q}"`
          : "Spare parts";

  // Drill-in strip: when filtering by brand/model/year/q without a category,
  // surface every top-level subtree that still has at least one match.
  const showSubcategoryChips =
    !activeCategoryNode && Boolean(brandSlug || productBrandSlug || modelId || q);
  const subcategoryChips = showSubcategoryChips
    ? await (async () => {
        const candidates = nav.tree.map((n) => ({ id: n.id, name: n.name, path: n.path }));
        const counts = await countMatchingProductsBySubtree(candidates, where);
        return candidates
          .map((c) => ({ ...c, count: counts.get(c.path) ?? 0 }))
          .filter((c) => c.count > 0);
      })()
    : [];

  // Helper to keep brand/model/year/q in the URL when navigating within the
  // category tree. Centralised so every link below uses the same QS.
  const preservedParams = (() => {
    const params = new URLSearchParams();
    if (brandSlug) params.set("brand", brandSlug);
    if (productBrandSlug) params.set("productBrand", productBrandSlug);
    if (modelId) params.set("model", modelId);
    if (yearStr) params.set("year", yearStr);
    if (q) params.set("q", q);
    return params.toString();
  })();
  const linkForCategory = (path: string | null) => {
    const base = "/products";
    const segs: string[] = [];
    if (path) segs.push(`category=${path}`);
    if (preservedParams) segs.push(preservedParams);
    return segs.length ? `${base}?${segs.join("&")}` : base;
  };

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-site px-[var(--gutter)] py-6 lg:py-8">
        <Breadcrumbs
          className="mb-3"
          items={(() => {
            const out: Crumb[] = [{ label: "Products", href: "/products" }];
            for (let i = 0; i < ancestors.length; i++) {
              const a = ancestors[i];
              const last = i === ancestors.length - 1;
              out.push({ label: a.name, href: last ? undefined : linkForCategory(a.path) });
            }
            if (!ancestors.length && activeBrand) {
              out.push({ label: activeBrand.name });
            }
            return out;
          })()}
        />

        <div className="mb-4">
          <h1 className="font-head text-[34px] leading-[0.95] tracking-[0.02em] text-ink lg:text-[46px]">
            {heading}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {activeCategoryNode?.description
              ? `${activeCategoryNode.description} · `
              : null}
            <span className="font-semibold text-ink">{products.length}</span>{" "}
            {products.length === 1 ? "result" : "results"}
          </p>
        </div>

        {subcategoryChips.length > 0 && (
          <div className="chips">
            {subcategoryChips.map((c) => (
              <Link key={c.id} href={linkForCategory(c.path)} className="chip">
                {c.name} <span className="opacity-70">({c.count})</span>
              </Link>
            ))}
          </div>
        )}

        <CompactFilters
          brands={brands}
          productBrands={productBrands}
          models={allModels}
          categories={allCategories}
        />

        <div className="listing mt-4">
          <CategorySidebar tree={nav.tree} selectedPath={activeCategoryNode?.path ?? null} />

          <div className="min-w-0">
            {products.length === 0 ? (
              <div className="rounded-[14px] border border-line bg-white p-14 text-center">
                <PackageX className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 font-head text-2xl tracking-[0.03em] text-ink">
                  {modelId || brandSlug
                    ? "No products available for this selection"
                    : "No parts match these filters"}
                </h3>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                  Try a different brand or model, or browse all parts.
                </p>
                <Link
                  href={activeCategoryNode
                    ? `/products?category=${activeCategoryNode.path}`
                    : "/products"}
                  className="mt-5 inline-flex items-center rounded-[10px] border border-line bg-white px-4 py-2.5 text-[13px] font-bold text-ink transition hover:border-red hover:text-red"
                >
                  {activeCategoryNode ? "Reset filters in this category" : "Clear all filters"}
                </Link>
              </div>
            ) : (
              <div className="grid g-4">
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
