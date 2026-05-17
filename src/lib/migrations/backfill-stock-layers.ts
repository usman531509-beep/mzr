import type { PrismaClient } from "@prisma/client";
import type { MigrationSummary } from "./index";

/**
 * Create StockLayer rows for stock that existed before FIFO tracking was
 * wired in, and populate `unitRetail` on any legacy layers that don't have
 * one. Re-syncs product.price to the oldest active layer's unitRetail.
 *
 * Idempotent — products already in balance are skipped.
 */
export async function backfillStockLayers(db: PrismaClient): Promise<MigrationSummary> {
  const log: string[] = [];

  // 1. PO-sourced layers for every RECEIVED PO line that doesn't have one.
  const poItems = await db.purchaseOrderItem.findMany({
    where: {
      productId: { not: null },
      po: { status: "RECEIVED", stockReceived: true },
      stockLayer: null,
    },
    include: {
      po: { select: { receivedAt: true, createdAt: true, poNumber: true } },
      product: { select: { price: true } },
    },
    orderBy: { po: { receivedAt: "asc" } },
  });

  log.push(`PO-sourced layers to create: ${poItems.length}`);
  for (const it of poItems) {
    if (!it.productId) continue;
    const receivedAt = it.po.receivedAt ?? it.po.createdAt;
    await db.stockLayer.create({
      data: {
        productId: it.productId,
        sourcePoItemId: it.id,
        source: "PURCHASE_ORDER",
        unitCost: it.unitCost,
        unitRetail: it.product?.price ?? 0,
        qtyReceived: it.quantity,
        qtyRemaining: it.quantity,
        receivedAt,
      },
    });
    log.push(`  + ${it.po.poNumber} · ${it.name} · ${it.quantity} @ cost ${Number(it.unitCost).toFixed(2)} (${receivedAt.toISOString().slice(0, 10)})`);
  }

  // 2. Reconcile each product so SUM(layer.qtyRemaining) == product.stock.
  //    Also patch any layer with unitRetail=null using the product's current price.
  const products = await db.product.findMany({
    select: { id: true, name: true, stock: true, price: true, costPrice: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  let initialAdded = 0;
  let writeOffsApplied = 0;
  let balanced = 0;
  let retailPatched = 0;
  let productsRetailRefreshed = 0;

  for (const p of products) {
    const updated = await db.stockLayer.updateMany({
      where: { productId: p.id, unitRetail: null },
      data: { unitRetail: p.price },
    });
    if (updated.count > 0) {
      retailPatched += updated.count;
      log.push(`  retail patched on ${updated.count} layer(s) for ${p.name} @ ${Number(p.price).toFixed(2)}`);
    }

    const layerSum = await db.stockLayer.aggregate({
      where: { productId: p.id },
      _sum: { qtyRemaining: true },
    });
    const remaining = layerSum._sum.qtyRemaining ?? 0;
    const diff = p.stock - remaining;

    if (diff > 0) {
      const earliestPoLayer = await db.stockLayer.findFirst({
        where: { productId: p.id, source: "PURCHASE_ORDER" },
        orderBy: { receivedAt: "asc" },
        select: { receivedAt: true },
      });
      const baseDate = earliestPoLayer?.receivedAt ?? p.createdAt;
      const receivedAt = new Date(baseDate.getTime() - 1000);
      await db.stockLayer.create({
        data: {
          productId: p.id,
          source: "INITIAL",
          unitCost: p.costPrice ?? 0,
          unitRetail: p.price,
          qtyReceived: diff,
          qtyRemaining: diff,
          receivedAt,
          notes: "Backfill: pre-FIFO stock at current cost & retail",
        },
      });
      initialAdded++;
      log.push(`  INITIAL → ${p.name}: +${diff} @ cost ${Number(p.costPrice ?? 0).toFixed(2)} · retail ${Number(p.price).toFixed(2)}`);
    } else if (diff < 0) {
      let toWriteOff = -diff;
      const layers = await db.stockLayer.findMany({
        where: { productId: p.id, qtyRemaining: { gt: 0 } },
        orderBy: [{ receivedAt: "asc" }, { createdAt: "asc" }],
        select: { id: true, qtyRemaining: true },
      });
      for (const layer of layers) {
        if (toWriteOff <= 0) break;
        const take = Math.min(layer.qtyRemaining, toWriteOff);
        await db.stockLayer.update({
          where: { id: layer.id },
          data: { qtyRemaining: { decrement: take } },
        });
        toWriteOff -= take;
      }
      writeOffsApplied++;
      log.push(`  WRITE-OFF → ${p.name}: −${-diff} units consumed by historical orders`);
    } else if (updated.count === 0) {
      balanced++;
    }

    const oldest = await db.stockLayer.findFirst({
      where: { productId: p.id, qtyRemaining: { gt: 0 } },
      orderBy: [{ receivedAt: "asc" }, { createdAt: "asc" }],
      select: { unitRetail: true },
    });
    if (oldest?.unitRetail != null && Number(oldest.unitRetail) !== Number(p.price)) {
      await db.product.update({
        where: { id: p.id },
        data: { price: oldest.unitRetail },
      });
      productsRetailRefreshed++;
      log.push(`  retail re-synced → ${p.name}: ${Number(p.price).toFixed(2)} → ${Number(oldest.unitRetail).toFixed(2)}`);
    }
  }

  log.push("");
  log.push("Summary:");
  log.push(`  PO layers created:           ${poItems.length}`);
  log.push(`  INITIAL layers:              ${initialAdded}`);
  log.push(`  Historical write-offs:       ${writeOffsApplied}`);
  log.push(`  Retail backfilled (layers):  ${retailPatched}`);
  log.push(`  Products with retail synced: ${productsRetailRefreshed}`);
  log.push(`  Products already balanced:   ${balanced}`);

  return {
    log,
    stats: {
      poLayersCreated:    poItems.length,
      initialLayersAdded: initialAdded,
      writeOffsApplied,
      retailPatched,
      productsRetailRefreshed,
      balanced,
    },
  };
}
