import { prisma } from "@/lib/prisma";
import { ProductBrandsClient } from "./client";

export default async function AdminProductBrands() {
  const brands = await prisma.productBrand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return (
    <ProductBrandsClient
      initial={brands.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        count: b._count.products,
      }))}
    />
  );
}
