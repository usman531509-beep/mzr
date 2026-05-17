import type { PrismaClient } from "@prisma/client";
import type { MigrationSummary } from "./index";

const ORDER_PREFIX = "MZR";
const PO_PREFIX    = "PO";
const START        = 1000;

/**
 * Resequence every Order and PurchaseOrder so the human-readable number
 * starts at MZR1000 / PO1000 (oldest first). Idempotent.
 *
 * - Orders: orderNumber is nullable, so we null-out all rows and re-assign.
 * - POs: poNumber is required, so we park existing values under a temp
 *   prefix to dodge the @unique constraint, then assign final numbers.
 */
export async function renumberOrdersAndPos(db: PrismaClient): Promise<MigrationSummary> {
  const log: string[] = [];
  let orderCount = 0;
  let poCount = 0;

  await db.$transaction(async (tx) => {
    const orders = await tx.order.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, customerName: true, createdAt: true },
    });
    if (orders.length === 0) {
      log.push("Orders: nothing to renumber.");
    } else {
      log.push(`Orders: renumbering ${orders.length} from ${ORDER_PREFIX}${START}…`);
      await tx.order.updateMany({ data: { orderNumber: null } });
      let seq = START;
      for (const o of orders) {
        const num = `${ORDER_PREFIX}${seq}`;
        await tx.order.update({ where: { id: o.id }, data: { orderNumber: num } });
        log.push(`  ${num} ← ${o.id.slice(0, 8)}…  (${o.customerName}, ${o.createdAt.toISOString().slice(0, 10)})`);
        seq++;
      }
      orderCount = orders.length;
    }
  });

  await db.$transaction(async (tx) => {
    const pos = await tx.purchaseOrder.findMany({
      orderBy: { createdAt: "asc" },
      include: { supplier: { select: { name: true } } },
    });
    if (pos.length === 0) {
      log.push("Purchase orders: nothing to renumber.");
    } else {
      log.push(`Purchase orders: renumbering ${pos.length} from ${PO_PREFIX}${START}…`);
      // Park existing numbers under unique temp values first.
      for (const p of pos) {
        await tx.purchaseOrder.update({
          where: { id: p.id },
          data: { poNumber: `__TMP__${p.id}` },
        });
      }
      let seq = START;
      for (const p of pos) {
        const num = `${PO_PREFIX}${seq}`;
        await tx.purchaseOrder.update({ where: { id: p.id }, data: { poNumber: num } });
        log.push(`  ${num} ← ${p.id.slice(0, 8)}…  (${p.supplier.name}, ${p.createdAt.toISOString().slice(0, 10)})`);
        seq++;
      }
      poCount = pos.length;
    }
  });

  return { log, stats: { ordersRenumbered: orderCount, posRenumbered: poCount } };
}
