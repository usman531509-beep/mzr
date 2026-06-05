import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { StatCard } from "@/components/admin/StatCard";
import { StockClient } from "@/components/admin/StockClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Boxes, AlertTriangle, PackageX, DollarSign } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function StockPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const brandId = typeof sp.brand === "string" ? sp.brand : "";
  const categoryId = typeof sp.category === "string" ? sp.category : "";

  const where: Prisma.ProductWhereInput = { active: true, deletedAt: null };
  if (q) {
    where.OR = [
      { name:      { contains: q, mode: "insensitive" } },
      { sku:       { contains: q, mode: "insensitive" } },
      { oemNumber: { contains: q, mode: "insensitive" } },
    ];
  }
  if (brandId) where.brandId = brandId;
  if (categoryId) where.categoryId = categoryId;

  const [products, brands, categories, oosCount, lowList, totalProducts] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ stock: "asc" }, { name: "asc" }],
      include: {
        brand:    { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.category.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.count({ where: { active: true, stock: 0, deletedAt: null } }),
    // Low-stock count is computed from a comparison against another column,
    // which Prisma can't express directly; fetch the small set and count.
    prisma.product.findMany({
      where: { active: true, stock: { gt: 0 }, deletedAt: null },
      select: { id: true, stock: true, lowStockThreshold: true, price: true, costPrice: true },
    }),
    prisma.product.count({ where: { active: true, deletedAt: null } }),
  ]);

  const lowCount = lowList.filter((p) => p.stock <= p.lowStockThreshold).length;
  const stockValueRetail = products.reduce((s, p) => s + Number(p.price) * p.stock, 0);
  const stockValueCost = products.reduce(
    (s, p) => s + (p.costPrice ? Number(p.costPrice) : 0) * p.stock,
    0,
  );
  const projectedProfit = Math.max(0, stockValueRetail - stockValueCost);

  // Apply the status filter in JS since it depends on the product's own
  // threshold column.
  const filtered = products.filter((p) => {
    if (status === "out")  return p.stock === 0;
    if (status === "low")  return p.stock > 0 && p.stock <= p.lowStockThreshold;
    if (status === "ok")   return p.stock > p.lowStockThreshold;
    return true;
  });

  const outRows = products.filter((p) => p.stock === 0);

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock</h1>
        <p className="text-sm text-muted-foreground">
          Inventory levels with low-stock and out-of-stock alerts.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total products" value={totalProducts} icon={Boxes} />
        <StatCard
          label="Out of stock"
          value={oosCount}
          icon={PackageX}
          accent={oosCount > 0 ? "primary" : undefined}
          sub={oosCount > 0 ? "Action required" : "All stocked"}
        />
        <StatCard
          label="Low stock"
          value={lowCount}
          icon={AlertTriangle}
          accent={lowCount > 0 ? "warning" : undefined}
          sub={lowCount > 0 ? "Restock soon" : "Healthy"}
        />
        <StatCard
          label="Stock value · retail"
          value={fmtMoney(stockValueRetail)}
          icon={DollarSign}
          accent="success"
          sub={`Cost: ${fmtMoney(stockValueCost)} · Margin: ${fmtMoney(projectedProfit)}`}
        />
      </div>

      {outRows.length > 0 && (
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PackageX className="h-4 w-4 text-rose-400" />
              Out of stock — {outRows.length} item{outRows.length === 1 ? "" : "s"}
            </CardTitle>
            <CardDescription>
              These products are listed but have zero units. They show as &quot;Sold out&quot; on the storefront.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {outRows.slice(0, 12).map((p) => (
                <li key={p.id} className="rounded-md border border-rose-500/30 bg-background px-2.5 py-1 text-[12px]">
                  {p.name}{" "}
                  <span className="text-muted-foreground">· {p.brand.name}</span>
                </li>
              ))}
              {outRows.length > 12 && (
                <li className="text-[12px] text-muted-foreground">
                  +{outRows.length - 12} more
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      <StockClient
        rows={filtered.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          oemNumber: p.oemNumber,
          image: p.images[0] ?? null,
          brand: p.brand.name,
          category: p.category.name,
          brandId: p.brandId,
          categoryId: p.categoryId,
          stock: p.stock,
          lowStockThreshold: p.lowStockThreshold,
          price: Number(p.price),
          costPrice: p.costPrice == null ? null : Number(p.costPrice),
        }))}
        totalAll={products.length}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
