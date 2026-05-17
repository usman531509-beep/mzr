import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { CreateOrderForm } from "@/components/admin/CreateOrderForm";

export const dynamic = "force-dynamic";

export default async function AdminCreateOrderPage() {
  const [users, products, brands, categories, models, tradeRows] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, email: true, phone: true,
        address: true, city: true, country: true,
        tradeApproved: true,
      },
    }),
    prisma.product.findMany({
      where: { active: true, stock: { gt: 0 } },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, sku: true, oemNumber: true,
        price: true, stock: true, images: true,
        brandId: true, categoryId: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
        compatibilities: { select: { bikeModelId: true, yearFrom: true, yearTo: true } },
      },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.bikeModel.findMany({
      orderBy: [{ brandId: "asc" }, { name: "asc" }],
      select: { id: true, name: true, brandId: true, yearStart: true, yearEnd: true },
    }),
    prisma.tradeDiscount.findMany({ select: { categoryId: true, percent: true } }),
  ]);
  const discountByCategory = Object.fromEntries(tradeRows.map((r) => [r.categoryId, r.percent]));

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Order</h1>
          <p className="text-sm text-muted-foreground">
            Build an order on behalf of a customer. The order will be tagged as
            created by you and appear in the customer&apos;s order history.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/orders" className="gap-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
          </Link>
        </Button>
      </div>

      <CreateOrderForm
        users={users.map((u) => ({
          id: u.id,
          name: u.name ?? "",
          email: u.email,
          phone: u.phone ?? "",
          address: u.address ?? "",
          city: u.city ?? "",
          country: u.country ?? "",
          tradeApproved: u.tradeApproved,
        }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          oemNumber: p.oemNumber,
          price: Number(p.price),
          stock: p.stock,
          image: p.images[0],
          brandId: p.brandId,
          categoryId: p.categoryId,
          brand: p.brand.name,
          category: p.category.name,
          fitments: p.compatibilities,
        }))}
        brands={brands}
        categories={categories}
        models={models}
        discountByCategory={discountByCategory}
      />
    </div>
  );
}
