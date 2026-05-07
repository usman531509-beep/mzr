import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Catalogue data that the layout-level navigation needs on every page render.
// Cached for 5 minutes and tagged so admin mutations to brands / categories /
// bike-models can invalidate it on demand. Without this, every page navigation
// would fire 3 round-trips to Postgres just to render the navbar — the single
// biggest source of latency on the storefront.

export const NAV_CACHE_TAG = "nav-data";

export const getNavData = unstable_cache(
  async () => {
    const [brands, models, categories] = await Promise.all([
      prisma.brand.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      prisma.bikeModel.findMany({
        orderBy: [{ brandId: "asc" }, { name: "asc" }],
        select: {
          id: true, name: true, brandId: true, yearStart: true, yearEnd: true,
        },
      }),
      prisma.category.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true, name: true, slug: true,
          _count: { select: { products: { where: { active: true } } } },
        },
      }),
    ]);
    return {
      brands,
      models,
      // Flatten the count into a plain field so JSON-cache friendly shape stays
      // small and the consumer doesn't need to dig into _count.
      categories: categories.map((c) => ({
        id: c.id, name: c.name, slug: c.slug,
        productCount: c._count.products,
      })),
    };
  },
  ["nav-data-v1"],
  { revalidate: 300, tags: [NAV_CACHE_TAG] },
);
