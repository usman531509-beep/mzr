import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/search?q=<query>&limit=<n>
//   Searches active products by: name, oemNumber, sku, brand.name, category.name.
//   Case-insensitive substring match. Returns shape tuned for the search dropdown.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 8), 20);

  if (q.length < 2) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const where = {
    active: true,
    deletedAt: null,
    OR: [
      { name:      { contains: q, mode: "insensitive" as const } },
      { oemNumber: { contains: q, mode: "insensitive" as const } },
      { sku:       { contains: q, mode: "insensitive" as const } },
      { brand:    { name: { contains: q, mode: "insensitive" as const } } },
      { category: { name: { contains: q, mode: "insensitive" as const } } },
    ],
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true, slug: true } },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    total,
    results: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price.toString(),
      stock: p.stock,
      image: p.images[0] ?? null,
      brand: p.brand.name,
      category: p.category.name,
      categorySlug: p.category.slug,
      oemNumber: p.oemNumber,
      sku: p.sku,
    })),
  });
}
