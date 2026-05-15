import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Hero } from "@/components/home/Hero";
import { CategoriesGrid } from "@/components/home/CategoriesGrid";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { PromoRow } from "@/components/home/PromoRow";
import { BrandsMarquee } from "@/components/home/BrandsMarquee";
import { TrustStrip } from "@/components/home/TrustStrip";
import { getTradeContext, tradePrice } from "@/lib/trade-pricing";
import { getNavData } from "@/lib/nav-cache";

// Per-request render so trade pricing reflects the current viewer.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Brands / categories / models are loaded from the shared 5-min cache that
  // already populates the header — avoids 3 duplicate Postgres queries per
  // home page render.
  const [trade, nav, featured] = await Promise.all([
    getTradeContext(),
    getNavData(),
    prisma.product.findMany({
      where: { featured: true, active: true },
      include: {
        brand: true,
        category: true,
        compatibilities: {
          include: { bikeModel: { include: { brand: true } } },
          take: 4,
        },
      },
      take: 8,
    }),
  ]);
  const { brands, models, categories } = nav;

  const empty =
    categories.length === 0 &&
    brands.length === 0 &&
    featured.length === 0;

  return (
    <>
      <Hero brands={brands} models={models} />
      {empty ? (
        <section className="mx-auto max-w-2xl px-[var(--gutter)] py-20 text-center">
          <span className="eyebrow">Catalogue empty</span>
          <h2 className="section-h2 mt-2">Awaiting <em>store setup</em></h2>
          <p className="mt-4 text-white/60">
            No categories, brands, or parts have been added yet. Once the store
            admin populates the catalogue from the admin panel, products will
            appear here automatically.
          </p>
          <Link href="/admin" className="btn-red mt-6 inline-flex">
            Open admin panel
          </Link>
        </section>
      ) : (
        <>
          {categories.length > 0 && <CategoriesGrid categories={categories} />}
          {(categories.length > 0 || brands.length > 0) && <PromoRow />}
          {featured.length > 0 && (
            <FeaturedProducts
              products={featured.map((p) => {
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
              })}
            />
          )}
          {brands.length > 0 && <BrandsMarquee brands={brands.map((b) => ({ name: b.name, slug: b.slug }))} />}
        </>
      )}
      <TrustStrip />
    </>
  );
}
