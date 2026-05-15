import { prisma } from "@/lib/prisma";
import { NewPOForm } from "@/components/admin/NewPOForm";

export const dynamic = "force-dynamic";

export default async function NewPOPage() {
  const [suppliers, products, brands, categories, models] = await Promise.all([
    prisma.supplier.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, sku: true, oemNumber: true,
        costPrice: true, price: true, images: true,
        brandId: true, categoryId: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
        compatibilities: { select: { bikeModelId: true, yearFrom: true, yearTo: true } },
      },
      take: 1000,
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.bikeModel.findMany({
      orderBy: [{ brandId: "asc" }, { name: "asc" }],
      select: { id: true, name: true, brandId: true, yearStart: true, yearEnd: true },
    }),
  ]);

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New purchase order</h1>
        <p className="text-sm text-muted-foreground">
          Pick a supplier and the parts you&apos;re ordering. Save as Draft, mark
          Placed when sent, or Received once it arrives — receiving will increase
          stock automatically.
        </p>
      </div>

      <NewPOForm
        suppliers={suppliers}
        brands={brands}
        categories={categories}
        models={models}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          oemNumber: p.oemNumber,
          costPrice: p.costPrice == null ? null : Number(p.costPrice),
          retail: Number(p.price),
          image: p.images[0] ?? null,
          brandId: p.brandId,
          brandName: p.brand.name,
          categoryId: p.categoryId,
          categoryName: p.category.name,
          fitments: p.compatibilities,
        }))}
      />
    </div>
  );
}
