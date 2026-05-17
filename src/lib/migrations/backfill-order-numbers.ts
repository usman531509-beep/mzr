import type { PrismaClient } from "@prisma/client";
import type { MigrationSummary } from "./index";

const PREFIX = "MZR";
const START = 1000;

/**
 * Assign an MZR number to any order with orderNumber=NULL. Picks up after
 * the highest existing number. Idempotent — rows with a number are skipped.
 */
export async function backfillOrderNumbers(db: PrismaClient): Promise<MigrationSummary> {
  const log: string[] = [];

  // Highest existing numeric suffix (computed in JS so digit-count crossings
  // sort correctly, e.g. MZR9999 vs MZR10000).
  const existing = await db.order.findMany({
    where: { orderNumber: { startsWith: PREFIX } },
    select: { orderNumber: true },
  });
  let seq = START - 1;
  for (const r of existing) {
    if (!r.orderNumber) continue;
    const n = parseInt(r.orderNumber.slice(PREFIX.length), 10);
    if (Number.isFinite(n) && n > seq) seq = n;
  }
  seq += 1;

  const legacy = await db.order.findMany({
    where: { orderNumber: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true, customerName: true },
  });
  if (legacy.length === 0) {
    log.push("Nothing to backfill — every order already has an orderNumber.");
    return { log, stats: { backfilled: 0 } };
  }
  log.push(`Backfilling ${legacy.length} order(s) starting at ${PREFIX}${seq}…`);
  for (const o of legacy) {
    const num = `${PREFIX}${seq}`;
    await db.order.update({ where: { id: o.id }, data: { orderNumber: num } });
    log.push(`  ${num} ← ${o.id.slice(0, 8)}…  (${o.customerName}, ${o.createdAt.toISOString().slice(0, 10)})`);
    seq++;
  }
  return { log, stats: { backfilled: legacy.length } };
}
