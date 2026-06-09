import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/admin/StatCard";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Boxes, PackageX, PoundSterling, AlertTriangle } from "lucide-react";
import { ReportHeader } from "@/components/admin/reports/ReportHeader";
import { requireReportAccess } from "@/lib/reports/auth";
import { resolveRange } from "@/lib/reports/date-range";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

// Inventory report — snapshot of current stock state. The date range
// scopes the "units sold in period" + "revenue in period" columns so
// admins can see which lines are *moving* alongside the live stock
// valuation. The base stock numbers are always "right now".
export default async function InventoryReport({ searchParams }: { searchParams: SP }) {
  const session = await requireReportAccess("reports.view");
  if (!session) redirect("/admin");

  const sp = await searchParams;
  const range = resolveRange(sp, "all");

  // Active, non-deleted products + sold-in-period aggregation.
  // The base stock view is "now"; the date range only scopes the
  // sold/revenue columns so admins can see *what's moving* alongside
  // what's sitting on shelves.
  const orderItemWhere = range.from && range.to
    ? { order: { is: { createdAt: { gte: range.from, lte: range.to }, status: "DELIVERED" as const } } }
    : { order: { is: { status: "DELIVERED" as const } } };

  const [products, soldAgg] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, deletedAt: null },
      select: {
        id: true, name: true, sku: true, oemNumber: true,
        stock: true, lowStockThreshold: true,
        price: true, costPrice: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: orderItemWhere,
      _sum: { quantity: true },
    }),
  ]);

  const soldByProduct = new Map<string, number>();
  for (const row of soldAgg) {
    soldByProduct.set(row.productId, row._sum.quantity ?? 0);
  }

  let totalUnits = 0;
  let retailValue = 0;
  let costValue   = 0;
  let lowCount    = 0;
  let oosCount    = 0;
  const rows = products.map((p) => {
    const retail = Number(p.price) * p.stock;
    const cost   = p.costPrice ? Number(p.costPrice) * p.stock : 0;
    const soldInPeriod = soldByProduct.get(p.id) ?? 0;
    totalUnits += p.stock;
    retailValue += retail;
    costValue   += cost;
    if (p.stock === 0) oosCount++;
    else if (p.stock <= p.lowStockThreshold) lowCount++;
    return {
      ...p,
      retailValue: retail,
      costValue: cost,
      potentialMargin: retail - cost,
      soldInPeriod,
    };
  });

  const lowStock = rows
    .filter((r) => r.stock > 0 && r.stock <= r.lowStockThreshold)
    .sort((a, b) => a.stock - b.stock);

  const valued = rows
    .filter((r) => r.stock > 0)
    .sort((a, b) => b.retailValue - a.retailValue);

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Inventory report"
        subtitle={`Live snapshot of active stock. Excludes inactive and soft-deleted products · period: ${range.label}.`}
        exportPath="/api/admin/reports/inventory"
        currentRange={range.preset}
        currentFrom={range.from ? range.from.toISOString().slice(0, 10) : ""}
        currentTo={range.to ? range.to.toISOString().slice(0, 10) : ""}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Stock value (retail)"
          value={fmtMoney(retailValue)}
          icon={PoundSterling}
          accent="success"
          sub={`${totalUnits} units`}
        />
        <StatCard
          label="Stock value (cost)"
          value={fmtMoney(costValue)}
          icon={Boxes}
          sub={`Potential margin ${fmtMoney(retailValue - costValue)}`}
        />
        <StatCard
          label="Low stock"
          value={lowCount}
          icon={AlertTriangle}
          accent={lowCount > 0 ? "warning" : undefined}
          sub={lowCount > 0 ? "Below threshold" : "Healthy"}
        />
        <StatCard
          label="Out of stock"
          value={oosCount}
          icon={PackageX}
          accent={oosCount > 0 ? "primary" : undefined}
          sub={oosCount > 0 ? "Need restocking" : "Fully stocked"}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-end justify-between gap-3 p-5 pb-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Low stock alerts</h2>
              <p className="text-xs text-muted-foreground">
                Active products at or below their configured threshold but still in stock. Restock priority list.
              </p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right pr-5">Threshold</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStock.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No low-stock items. All active products are above their thresholds.
                </TableCell></TableRow>
              ) : lowStock.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-5">
                    <div className="font-medium">{p.name}</div>
                    {p.sku && <div className="text-xs text-muted-foreground">SKU {p.sku}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{p.category?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{p.brand?.name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-amber-300">{p.stock}</TableCell>
                  <TableCell className="pr-5 text-right tabular-nums text-muted-foreground">{p.lowStockThreshold}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-end justify-between gap-3 p-5 pb-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Stock valuation</h2>
              <p className="text-xs text-muted-foreground">
                Per-product valuation at retail and cost. Sorted by retail value — top of list ties up the most working capital.
              </p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Sold ({range.label})</TableHead>
                <TableHead className="text-right">Cost ea.</TableHead>
                <TableHead className="text-right">Retail ea.</TableHead>
                <TableHead className="text-right">Value @ cost</TableHead>
                <TableHead className="text-right pr-5">Value @ retail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {valued.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  No stock on hand.
                </TableCell></TableRow>
              ) : valued.slice(0, 50).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-5 font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm">{p.category?.name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.stock}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.soldInPeriod > 0
                      ? <span className="font-medium text-emerald-300">{p.soldInPeriod}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {p.costPrice ? fmtMoney(Number(p.costPrice)) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(Number(p.price))}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(p.costValue)}</TableCell>
                  <TableCell className="pr-5 text-right tabular-nums font-medium">{fmtMoney(p.retailValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {valued.length > 50 && (
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              Showing the 50 highest-value products. Use CSV / PDF export above for the complete list of {valued.length} products.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
