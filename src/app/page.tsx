import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Reveal } from "@/components/Reveal";
import { Hero } from "@/components/home/Hero";
import { TrustStrip } from "@/components/home/TrustStrip";
import { CategoriesGrid } from "@/components/home/CategoriesGrid";
import { InDemandBanner } from "@/components/home/InDemandBanner";
import { NewArrivals } from "@/components/home/NewArrivals";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { FinderCTA } from "@/components/home/FinderCTA";
import { BrandsGrid } from "@/components/home/BrandsGrid";
import { Newsletter } from "@/components/home/Newsletter";
import { getTradeContext, tradePrice } from "@/lib/trade-pricing";
import { getNavData } from "@/lib/nav-cache";
import type { ProductCardData } from "@/components/ProductCard";

// Per-request render so trade pricing reflects the current viewer.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Single round-trip for everything the home page needs: shared nav cache,
  // featured + new-arrival product strips, top-brand tiles, and a small
  // server-side hydration of the category imageUrl that the nav cache
  // intentionally doesn't carry.
  const [
    trade, nav, featuredRows, newArrivalRows, demandingRows,
    brandRows, categoryImages,
  ] = await Promise.all([
      getTradeContext(),
      getNavData(),
      prisma.product.findMany({
        where: { featured: true, active: true, deletedAt: null },
        include: {
          brand: true,
          category: true,
          compatibilities: {
            include: { bikeModel: { include: { brand: true } } },
            take: 4,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.product.findMany({
        where: { active: true, deletedAt: null },
        include: {
          brand: true,
          category: true,
          compatibilities: {
            include: { bikeModel: { include: { brand: true } } },
            take: 4,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      // Admin-curated "in demand" picks. Lighter payload than the other
      // product strips — only the fields the banner actually renders.
      prisma.product.findMany({
        where: { demanding: true, active: true, deletedAt: null },
        select: {
          id: true, slug: true, name: true, price: true, stock: true,
          images: true,
          brand: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 3,
      }),
      prisma.brand.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true, name: true, slug: true, logoUrl: true,
          // Count via the M2M `compatProducts` relation so a multi-brand
          // product appears in every ticked brand's tile, matching the
          // /products?brand=… filter behaviour. The primary brandId is
          // always part of this set, so this stays a superset of the
          // legacy single-brand count.
          _count: { select: { compatProducts: { where: { active: true, deletedAt: null } } } },
        },
      }),
      prisma.category.findMany({
        where: { depth: 0, deletedAt: null },
        select: { id: true, imageUrl: true },
      }),
    ]);

  const { brands, models, tree } = nav;

  // Map a product row → ProductCard data shape (used by both featured + new).
  const toCard = (
    p: typeof featuredRows[number],
  ): ProductCardData => {
    const tp = tradePrice(Number(p.price), p.categoryId, trade);
    return {
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
    };
  };

  // Top-level categories with at least one product, enriched with imageUrl
  // for the new visual grid. Falls back to emoji when no image is uploaded.
  const imageByCategoryId = new Map(categoryImages.map((c) => [c.id, c.imageUrl]));
  const topCategories = tree
    .filter((c) => c.productCount > 0)
    .map((c) => ({ ...c, imageUrl: imageByCategoryId.get(c.id) ?? null }));

  // Top brands by stocked-product count (most useful for shoppers).
  // `compatProducts` is the M2M side, so a part ticked for Honda + Yamaha
  // contributes to both tiles' counts.
  const topBrands = brandRows
    .filter((b) => b._count.compatProducts > 0)
    .sort((a, b) => b._count.compatProducts - a._count.compatProducts)
    .slice(0, 10)
    .map((b) => ({
      id: b.id, name: b.name, slug: b.slug,
      logoUrl: b.logoUrl, productCount: b._count.compatProducts,
    }));

  const featured = featuredRows.map(toCard);
  const newArrivals = newArrivalRows.map(toCard);
  const demandingPicks = demandingRows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price.toString(),
    image: p.images[0] ?? null,
    brand: p.brand.name,
    stockCopy: p.stock > 10
      ? "In stock"
      : p.stock > 0
        ? `Only ${p.stock} left`
        : "Sold out",
  }));

  const empty =
    tree.length === 0 &&
    brands.length === 0 &&
    featuredRows.length === 0;

  return (
    <>
      <Hero brands={brands} models={models} />

      {empty ? (
        <section className="h-section">
          <div className="mx-auto max-w-2xl px-[22px] text-center">
            <span className="h-eyebrow">Catalogue empty</span>
            <h2 className="mt-5 font-head text-5xl uppercase tracking-wide text-ink">
              Awaiting store setup
            </h2>
            <p className="mt-4 text-muted-foreground">
              No categories, brands, or parts have been added yet. Once the store
              admin populates the catalogue from the admin panel, products will
              appear here automatically.
            </p>
            <Link href="/admin" className="btn-red mt-6 inline-flex">
              Open admin panel
            </Link>
          </div>
        </section>
      ) : (
        <>
          {/* Trust badges sit immediately under the Hero so the first
              scroll surfaces the "safe to buy" cues. Each section fades/slides
              in on scroll (see Reveal — lightweight, GPU-only). */}
          <Reveal><TrustStrip /></Reveal>

          {topCategories.length > 0 && <Reveal><CategoriesGrid categories={topCategories} /></Reveal>}

          {topBrands.length > 0 && <Reveal><BrandsGrid brands={topBrands} /></Reveal>}

          <Reveal><InDemandBanner products={demandingPicks} /></Reveal>

          {newArrivals.length > 0 && <Reveal><NewArrivals products={newArrivals} /></Reveal>}

          {featured.length > 0 && <Reveal><FeaturedProducts products={featured} /></Reveal>}

          <Reveal><FinderCTA /></Reveal>

          <Reveal><Newsletter /></Reveal>
        </>
      )}
    </>
  );
}
