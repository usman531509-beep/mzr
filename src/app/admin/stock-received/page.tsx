import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/admin/StatCard";
import { StockReceivedClient } from "@/components/admin/StockReceivedClient";
import { Pagination } from "@/components/Pagination";
import { parsePagination } from "@/lib/pagination";
import { Boxes, DollarSign, Layers, PackageCheck } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function StockReceivedPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";

  // Stock Received is the standalone manual-receipt log. PO-sourced layers
  // belong to the Purchase Orders flow and are intentionally hidden here.
  const where: Prisma.StockLayerWhereInput = {
    source: { in: ["MANUAL_ADJUSTMENT", "INITIAL"] },
  };
  if (q) {
    where.OR = [
      { product: { name: { contains: q, mode: "insensitive" } } },
      { product: { sku:  { contains: q, mode: "insensitive" } } },
      { notes: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status === "remaining") where.qtyRemaining = { gt: 0 };
  else if (status === "depleted") where.qtyRemaining = 0;

  const { page, pageSize, skip, take } = parsePagination(sp, { defaultSize: 25 });

  const [layers, total, allLayers, products] = await Promise.all([
    prisma.stockLayer.findMany({
      where,
      orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take,
      include: {
        product: {
          select: { id: true, name: true, slug: true, sku: true, images: true },
        },
      },
    }),
    prisma.stockLayer.count({ where }),
    // KPIs are scoped to the same source set as the page (manual + initial)
    // so the inventory value cards reflect what's visible.
    prisma.stockLayer.findMany({
      where: { source: { in: ["MANUAL_ADJUSTMENT", "INITIAL"] } },
      select: { qtyReceived: true, qtyRemaining: true, unitCost: true, source: true, productId: true },
    }),
    // Product list for the "Add stock" dialog's picker.
    prisma.product.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, sku: true, stock: true,
        price: true, costPrice: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
        images: true,
      },
    }),
  ]);

  let totalRemainingUnits = 0;
  let totalRemainingValue = 0;
  let totalReceivedUnits = 0;
  let totalReceivedValue = 0;
  const productIdsWithStock = new Set<string>();
  for (const l of allLayers) {
    totalReceivedUnits  += l.qtyReceived;
    totalReceivedValue  += l.qtyReceived  * Number(l.unitCost);
    totalRemainingUnits += l.qtyRemaining;
    totalRemainingValue += l.qtyRemaining * Number(l.unitCost);
    if (l.qtyRemaining > 0) productIdsWithStock.add(l.productId);
  }
  const layersWithStock = allLayers.filter((l) => l.qtyRemaining > 0).length;

  // PO-sourced layers were excluded by the WHERE clause above; narrow the
  // type so the client can stick to the (MANUAL | INITIAL) union.
  const rows = layers
    .filter((l): l is typeof l & { source: "MANUAL_ADJUSTMENT" | "INITIAL" } =>
      l.source === "MANUAL_ADJUSTMENT" || l.source === "INITIAL")
    .map((l) => ({
      id: l.id,
      receivedAt: l.receivedAt.toISOString(),
      source: l.source,
      unitCost: Number(l.unitCost),
      unitRetail: l.unitRetail == null ? null : Number(l.unitRetail),
      qtyReceived: l.qtyReceived,
      qtyRemaining: l.qtyRemaining,
      notes: l.notes,
      product: {
        id: l.product.id,
        name: l.product.name,
        slug: l.product.slug,
        sku: l.product.sku,
        image: l.product.images[0] ?? null,
      },
    }));

  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stock: p.stock,
    price: Number(p.price),
    costPrice: p.costPrice ? Number(p.costPrice) : 0,
    brand: p.brand.name,
    category: p.category?.name ?? "Uncategorised",
    image: p.images[0] ?? null,
  }));

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock Received</h1>
        <p className="text-sm text-muted-foreground">
          Manual stock receipts independent of purchase orders. Each batch
          locks in its own cost — older stock is sold first (FIFO), so profit
          reflects the actual cost of each unit sold.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Inventory value · at cost"
          value={fmtMoney(totalRemainingValue)}
          icon={DollarSign}
          accent="success"
          sub={`${totalRemainingUnits} unit${totalRemainingUnits === 1 ? "" : "s"} across ${layersWithStock} batch${layersWithStock === 1 ? "" : "es"}`}
        />
        <StatCard
          label="Products with stock"
          value={productIdsWithStock.size}
          icon={Boxes}
          sub={`Across ${layersWithStock} batch${layersWithStock === 1 ? "" : "es"}`}
        />
        <StatCard
          label="Lifetime received"
          value={`${totalReceivedUnits}`}
          icon={PackageCheck}
          sub={`${fmtMoney(totalReceivedValue)} at cost`}
        />
        <StatCard
          label="Total batches"
          value={allLayers.length}
          icon={Layers}
          sub={`${layersWithStock} active · ${allLayers.length - layersWithStock} depleted`}
        />
      </div>

      <Card>
        <CardContent className="p-4 lg:p-5">
          <StockReceivedClient rows={rows} products={productOptions} />
          <Pagination total={total} pageSize={pageSize} currentPage={page} />
        </CardContent>
      </Card>
    </div>
  );
}
