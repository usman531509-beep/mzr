import { prisma } from "@/lib/prisma";
import { ProductsPageClient } from "@/components/admin/ProductsPageClient";

export default async function AdminProductsPage() {
  const [products, brands, categories, models] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { brand: true, category: true, compatibilities: true },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      orderBy: [{ depth: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true, name: true, slug: true, parentId: true, path: true,
        _count: { select: { children: true } },
      },
    }),
    prisma.bikeModel.findMany({
      orderBy: [{ brandId: "asc" }, { name: "asc" }],
      include: { brand: true },
    }),
  ]);

  return (
    <ProductsPageClient
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price.toString(),
        costPrice: p.costPrice ? p.costPrice.toString() : null,
        stock: p.stock,
        brand: p.brand.name,
        category: p.category.name,
        categorySlug: p.category.slug,
        featured: p.featured,
        active: p.active,
        image: p.images[0] ?? null,
        description: p.description,
        brandId: p.brandId,
        categoryId: p.categoryId,
        sku: p.sku,
        oemNumber: p.oemNumber,
        images: p.images,
        compatibilities: p.compatibilities.map((c) => ({
          bikeModelId: c.bikeModelId, yearFrom: c.yearFrom, yearTo: c.yearTo,
        })),
      }))}
      brands={brands.map((b) => ({ id: b.id, name: b.name }))}
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
