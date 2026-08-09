import { prisma } from "@/lib/prisma";
import { parsePagination } from "@/lib/pagination";
import { ProductsPageClient } from "@/components/admin/ProductsPageClient";

type SP = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(sp, { defaultSize: 25 });

  // `?view=deleted` switches the page into the soft-delete bin. Default is
  // the live catalogue (active + inactive, but no soft-deleted rows). The
  // bin count is always loaded so the tab can show a badge.
  const view = sp.view === "deleted" ? "deleted" : "live";
  const productWhere = view === "deleted"
    ? { deletedAt: { not: null } }
    : { deletedAt: null };

  const [products, total, deletedCount, brands, productBrands, categories, models] = await Promise.all([
    prisma.product.findMany({
      where: productWhere,
      orderBy: { createdAt: "desc" },
      include: {
        brand: true,
        // Full M2M set so PartDialog can hydrate every ticked checkbox in
        // one trip — without this, edit-mode would show only the primary
        // brand checked even though the part fits several.
        brands: { select: { id: true } },
        category: true,
        // Surfaced so the admin UI can hint at the "would rehome to X"
        // category for orphaned products.
        savedCategory: { select: { id: true, name: true } },
        compatibilities: true,
      },
      skip,
      take,
    }),
    prisma.product.count({ where: productWhere }),
    prisma.product.count({ where: { deletedAt: { not: null } } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.productBrand.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ depth: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true, name: true, slug: true, parentId: true, path: true,
        _count: { select: { children: { where: { deletedAt: null } } } },
      },
    }),
    prisma.bikeModel.findMany({
      orderBy: [{ brandId: "asc" }, { name: "asc" }],
      include: { brand: true },
    }),
  ]);

  // `?addTo=<categoryId>` — set when the admin clicks "Add product" from the
  // Categories page. The client auto-opens the part dialog with this category
  // pre-selected so they never pick it manually.
  const addToCategoryId = typeof sp.addTo === "string" ? sp.addTo : undefined;

  return (
    <ProductsPageClient
      view={view}
      deletedCount={deletedCount}
      addToCategoryId={addToCategoryId}
      pagination={{ page, pageSize, total }}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price.toString(),
        costPrice: p.costPrice ? p.costPrice.toString() : null,
        stock: p.stock,
        brand: p.brand.name,
        category: p.category?.name ?? null,
        categorySlug: p.category?.slug ?? null,
        featured: p.featured,
        demanding: p.demanding,
        active: p.active,
        image: p.images[0] ?? null,
        description: p.description,
        brandId: p.brandId,
        brandIds: p.brands.map((b) => b.id),
        productBrandId: p.productBrandId,
        categoryId: p.categoryId,
        savedCategoryId: p.savedCategoryId,
        savedCategoryName: p.savedCategory?.name ?? null,
        sku: p.sku,
        oemNumber: p.oemNumber,
        images: p.images,
        compatibilities: p.compatibilities.map((c) => ({
          bikeModelId: c.bikeModelId, yearFrom: c.yearFrom, yearTo: c.yearTo,
        })),
      }))}
      brands={brands.map((b) => ({ id: b.id, name: b.name }))}
      productBrands={productBrands.map((b) => ({ id: b.id, name: b.name }))}
      categories={categories.map((c) => ({
        id: c.id, name: c.name, slug: c.slug,
        parentId: c.parentId, path: c.path, childCount: c._count.children,
      }))}
      models={models.map((m) => ({
        id: m.id, name: m.name, brandId: m.brandId,
        yearStart: m.yearStart, yearEnd: m.yearEnd,
        brand: { name: m.brand.name },
      }))}
    />
  );
}
