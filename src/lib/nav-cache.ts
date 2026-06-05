import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Catalogue data that the layout-level navigation needs on every page render.
// Cached for 5 minutes and tagged so admin mutations to brands / categories /
// bike-models can invalidate it on demand. Without this, every page navigation
// would fire 3 round-trips to Postgres just to render the navbar — the single
// biggest source of latency on the storefront.

export const NAV_CACHE_TAG = "nav-data";

export type NavCategoryNode = {
  id: string;
  name: string;
  slug: string;
  path: string;
  depth: number;
  productCount: number;            // active products under this node + descendants
  children: NavCategoryNode[];
};

export const getNavData = unstable_cache(
  async () => {
    const [brands, productBrands, models, categoryRows, productCategoryPaths] = await Promise.all([
      prisma.brand.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      // Independent of bike-brand (Honda, Yamaha) — these are part
      // manufacturers (Brembo, NGK, EBC). Used by the storefront nav and
      // the /products filter chip.
      prisma.productBrand.findMany({
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
        where: { deletedAt: null },
        orderBy: [{ depth: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true, name: true, slug: true, parentId: true, path: true, depth: true,
        },
      }),
      // Pull each active product's category path so we can roll counts up the
      // tree in one pass. One round-trip beats N count() queries.
      prisma.product.findMany({
        where: { active: true, deletedAt: null },
        select: { category: { select: { path: true } } },
      }),
    ]);

    // Roll up product counts: every ancestor segment gets +1 per matching
    // product. {"brake/motorcycle-brake-pads/organic": 12} contributes to
    // "brake", "brake/motorcycle-brake-pads", and "brake/.../organic".
    const counts = new Map<string, number>();
    for (const p of productCategoryPaths) {
      const segs = p.category.path.split("/");
      for (let i = 1; i <= segs.length; i++) {
        const key = segs.slice(0, i).join("/");
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    // Assemble the tree (one in-memory pass on rows already ordered by depth).
    const nodeById = new Map<string, NavCategoryNode>();
    const tree: NavCategoryNode[] = [];
    for (const r of categoryRows) {
      const node: NavCategoryNode = {
        id: r.id, name: r.name, slug: r.slug, path: r.path, depth: r.depth,
        productCount: counts.get(r.path) ?? 0,
        children: [],
      };
      nodeById.set(r.id, node);
      if (r.parentId && nodeById.has(r.parentId)) {
        nodeById.get(r.parentId)!.children.push(node);
      } else {
        tree.push(node);
      }
    }

    // Flat legacy shape kept for components that just want a list (e.g. the
    // brand/category filter dropdowns and admin DashboardClient). `count` is
    // the rolled-up active-product count (this row + all descendants).
    const flat = categoryRows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      path: r.path,
      depth: r.depth,
      parentId: r.parentId,
      count: counts.get(r.path) ?? 0,
    }));

    return { brands, productBrands, models, categories: flat, tree };
  },
  ["nav-data-v3-product-brands"],
  { revalidate: 300, tags: [NAV_CACHE_TAG] },
);
