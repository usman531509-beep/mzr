import { prisma } from "@/lib/prisma";
import { BrandsClient } from "./client";

export default async function AdminBrands() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return <BrandsClient initial={brands.map((b) => ({ id: b.id, name: b.name, slug: b.slug, logoUrl: b.logoUrl, count: b._count.products }))} />;
}
