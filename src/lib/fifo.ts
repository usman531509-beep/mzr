// FIFO inventory layer helpers.
//
// Invariant we maintain across all callers:
//   SUM(stockLayer.qtyRemaining for productId == P) == product.stock for P.
//
// Always call these inside a Prisma transaction — they read + write multiple
// rows that must move together.

import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient;
// Reader contract for read-only helpers — accepts either the base PrismaClient
// or a TransactionClient so callers can use the same helper inside or outside
// a $transaction block.
type FifoReader = Pick<PrismaClient, "stockLayer">;

/**
 * Consume `qty` units of a product from its oldest layers (lowest
 * receivedAt). Writes one OrderItemCostAllocation row per layer touched,
 * decrements each layer's qtyRemaining, and returns the per-layer breakdown.
 *
 * If the available qty across layers is less than what's needed (which would
 * indicate the FIFO invariant has drifted from product.stock), throws.
 *
 * NOTE: caller is responsible for also decrementing product.stock.
 */
export async function consumeLayersFifo(
  tx: Tx,
  args: { orderItemId: string; productId: string; qty: number },
): Promise<Array<{ stockLayerId: string; qty: number; unitCost: number }>> {
  const { orderItemId, productId, qty } = args;
  if (qty <= 0) return [];

  // Lock the relevant layer rows for the duration of this transaction so a
  // concurrent order can't double-consume the same units.
  const layers = await tx.stockLayer.findMany({
    where: { productId, qtyRemaining: { gt: 0 } },
    orderBy: [{ receivedAt: "asc" }, { createdAt: "asc" }],
    select: { id: true, qtyRemaining: true, unitCost: true },
  });

  let remaining = qty;
  const allocations: Array<{ stockLayerId: string; qty: number; unitCost: number }> = [];

  for (const layer of layers) {
    if (remaining <= 0) break;
    const take = Math.min(layer.qtyRemaining, remaining);
    if (take <= 0) continue;
    await tx.stockLayer.update({
      where: { id: layer.id },
      data: { qtyRemaining: { decrement: take } },
    });
    await tx.orderItemCostAllocation.create({
      data: {
        orderItemId,
        stockLayerId: layer.id,
        qty: take,
        unitCost: layer.unitCost,
      },
    });
    allocations.push({ stockLayerId: layer.id, qty: take, unitCost: Number(layer.unitCost) });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new Error(
      `FIFO: not enough stock layers for product ${productId} (short ${remaining} unit${remaining === 1 ? "" : "s"}). Run the backfill script.`,
    );
  }
  return allocations;
}

/**
 * Reverse FIFO consumption for an order item. Looks up its allocations,
 * restores qtyRemaining on each linked layer, then deletes the allocations.
 *
 * Caller is responsible for also incrementing product.stock.
 */
export async function reverseLayerConsumption(
  tx: Tx,
  args: { orderItemId: string },
): Promise<void> {
  const allocs = await tx.orderItemCostAllocation.findMany({
    where: { orderItemId: args.orderItemId },
    select: { id: true, stockLayerId: true, qty: true },
  });
  for (const a of allocs) {
    await tx.stockLayer.update({
      where: { id: a.stockLayerId },
      data: { qtyRemaining: { increment: a.qty } },
    });
  }
  if (allocs.length > 0) {
    await tx.orderItemCostAllocation.deleteMany({
      where: { id: { in: allocs.map((a) => a.id) } },
    });
  }
}

/**
 * Create a StockLayer for a PO line that's just been received. Idempotent —
 * if a layer already exists for the PO item it's left alone.
 *
 * Caller is responsible for also incrementing product.stock and (separately)
 * calling refreshProductRetail to keep the displayed price in sync.
 *
 * `unitRetail` defaults to the product's current `price` — POs don't capture
 * a new retail price, so the assumption is "sell at the current retail until
 * an admin changes it".
 */
export async function createLayerFromPoItem(
  tx: Tx,
  args: {
    poItemId: string;
    productId: string;
    quantity: number;
    unitCost: number;
    unitRetail?: number;
    receivedAt: Date;
  },
): Promise<void> {
  const existing = await tx.stockLayer.findUnique({
    where: { sourcePoItemId: args.poItemId },
    select: { id: true },
  });
  if (existing) return;

  let unitRetail = args.unitRetail;
  if (unitRetail === undefined) {
    const product = await tx.product.findUnique({
      where: { id: args.productId },
      select: { price: true },
    });
    unitRetail = product ? Number(product.price) : 0;
  }

  await tx.stockLayer.create({
    data: {
      productId: args.productId,
      sourcePoItemId: args.poItemId,
      source: "PURCHASE_ORDER",
      unitCost: args.unitCost,
      unitRetail,
      qtyReceived: args.quantity,
      qtyRemaining: args.quantity,
      receivedAt: args.receivedAt,
    },
  });
}

/**
 * Remove a PO-sourced layer (admin un-received the PO). Blocks if any of
 * the layer's units have already been sold — in that case the admin must
 * cancel the affected orders first.
 *
 * Caller is responsible for also decrementing product.stock.
 */
export async function removeLayerFromPoItem(
  tx: Tx,
  args: { poItemId: string },
): Promise<void> {
  const layer = await tx.stockLayer.findUnique({
    where: { sourcePoItemId: args.poItemId },
    select: { id: true, qtyReceived: true, qtyRemaining: true },
  });
  if (!layer) return;
  if (layer.qtyRemaining !== layer.qtyReceived) {
    const sold = layer.qtyReceived - layer.qtyRemaining;
    throw new Error(
      `Can't un-receive — ${sold} unit${sold === 1 ? "" : "s"} from this batch ${sold === 1 ? "has" : "have"} already been sold. Reverse the affected orders first.`,
    );
  }
  await tx.stockLayer.delete({ where: { id: layer.id } });
}

/**
 * Create a layer for stock that arrived outside a PO (admin manually bumped
 * the product's stock). Falls back to the product's current costPrice /
 * price for unspecified values. Returns the new layer id.
 *
 * Caller is responsible for also incrementing product.stock and (separately)
 * calling refreshProductRetail.
 */
export async function createManualLayer(
  tx: Tx,
  args: {
    productId: string;
    quantity: number;
    unitCost?: number;
    unitRetail?: number;
    notes?: string;
  },
): Promise<string> {
  let unitCost = args.unitCost;
  let unitRetail = args.unitRetail;
  if (unitCost === undefined || unitRetail === undefined) {
    const product = await tx.product.findUnique({
      where: { id: args.productId },
      select: { costPrice: true, price: true },
    });
    if (unitCost === undefined) {
      unitCost = product?.costPrice ? Number(product.costPrice) : 0;
    }
    if (unitRetail === undefined) {
      unitRetail = product ? Number(product.price) : 0;
    }
  }
  const layer = await tx.stockLayer.create({
    data: {
      productId: args.productId,
      source: "MANUAL_ADJUSTMENT",
      unitCost,
      unitRetail,
      qtyReceived: args.quantity,
      qtyRemaining: args.quantity,
      receivedAt: new Date(),
      notes: args.notes ?? null,
    },
    select: { id: true },
  });
  return layer.id;
}

/**
 * Walk the product's in-stock layers oldest-first and return the per-batch
 * retail breakdown that fulfilling `qty` units would use. Adjacent segments
 * at the same price are merged. If the layers don't cover `qty` (legacy
 * data, or stock drift), the remainder uses `fallbackRetail`.
 *
 * Read-only — safe to call outside a transaction. Used to split a single
 * cart line into multiple OrderItem rows so customers pay each unit at the
 * batch it'll be consumed from.
 */
export async function getFifoRetailBreakdown(
  reader: FifoReader,
  args: { productId: string; qty: number; fallbackRetail: number },
): Promise<Array<{ qty: number; unitRetail: number }>> {
  if (args.qty <= 0) return [];

  const layers = await reader.stockLayer.findMany({
    where: { productId: args.productId, qtyRemaining: { gt: 0 } },
    orderBy: [{ receivedAt: "asc" }, { createdAt: "asc" }],
    select: { qtyRemaining: true, unitRetail: true },
  });

  let remaining = args.qty;
  const out: Array<{ qty: number; unitRetail: number }> = [];
  for (const layer of layers) {
    if (remaining <= 0) break;
    const take = Math.min(layer.qtyRemaining, remaining);
    if (take <= 0) continue;
    const retail = layer.unitRetail == null ? args.fallbackRetail : Number(layer.unitRetail);
    // Merge with previous segment if the price matches — keeps the order
    // line list tidy when several adjacent batches share a price.
    const last = out[out.length - 1];
    if (last && last.unitRetail === retail) last.qty += take;
    else out.push({ qty: take, unitRetail: retail });
    remaining -= take;
  }
  if (remaining > 0) {
    // Layers don't cover the requested qty. Charge the leftover at the
    // product's current price rather than blocking — backfill will
    // normally prevent this, and the order-time stock check will already
    // have rejected genuine over-orders.
    out.push({ qty: remaining, unitRetail: args.fallbackRetail });
  }
  return out;
}

/**
 * Sync `product.price` with the oldest active stock layer's `unitRetail`.
 * Call this after any operation that might change which layer is oldest:
 *   - creating a new layer (could be older than existing if backfilled)
 *   - FIFO consumption depleting a layer (the next layer becomes oldest)
 *   - reversing FIFO consumption (a previously-depleted layer may return)
 *
 * If no in-stock layers exist (e.g. product is sold out) the price is left
 * unchanged — the catalogue keeps showing whatever it last showed so admins
 * can still see the product in lists.
 */
export async function refreshProductRetail(
  tx: Tx,
  productId: string,
): Promise<void> {
  const oldest = await tx.stockLayer.findFirst({
    where: { productId, qtyRemaining: { gt: 0 } },
    orderBy: [{ receivedAt: "asc" }, { createdAt: "asc" }],
    select: { unitRetail: true },
  });
  if (!oldest || oldest.unitRetail == null) return;
  await tx.product.update({
    where: { id: productId },
    data: { price: oldest.unitRetail },
  });
}

/**
 * Consume layers FIFO for a manual stock decrement (admin reduced stock
 * without an order — i.e. write-off, damage, shrinkage). Same logic as
 * order consumption but no OrderItemCostAllocation row is created.
 *
 * Caller is responsible for also decrementing product.stock.
 */
export async function consumeLayersForWriteOff(
  tx: Tx,
  args: { productId: string; qty: number },
): Promise<void> {
  if (args.qty <= 0) return;
  const layers = await tx.stockLayer.findMany({
    where: { productId: args.productId, qtyRemaining: { gt: 0 } },
    orderBy: [{ receivedAt: "asc" }, { createdAt: "asc" }],
    select: { id: true, qtyRemaining: true },
  });
  let remaining = args.qty;
  for (const layer of layers) {
    if (remaining <= 0) break;
    const take = Math.min(layer.qtyRemaining, remaining);
    if (take <= 0) continue;
    await tx.stockLayer.update({
      where: { id: layer.id },
      data: { qtyRemaining: { decrement: take } },
    });
    remaining -= take;
  }
  if (remaining > 0) {
    throw new Error(
      `FIFO: not enough stock layers to write off ${args.qty} unit${args.qty === 1 ? "" : "s"} (short ${remaining}). Run the backfill script.`,
    );
  }
}
