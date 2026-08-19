import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/products/list?categoryId=<id>
//   Products that live directly in one category, shaped like the dashboard's
//   DashboardProduct so the Categories page can list + edit them inline with the
//   shared PartDialog. Admin-guarded by middleware (/api/admin/:path*).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const categoryId = url.searchParams.get("categoryId");
  if (!categoryId) return NextResponse.json({ products: [] });

  const products = await prisma.product.findMany({
    where: { categoryId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      brand: true,
      brands: { select: { id: true } },
      category: true,
      savedCategory: { select: { id: true, name: true } },
      compatibilities: true,
    },
  });

  return NextResponse.json({
    products: products.map((p) => ({
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
    })),
  });
}
