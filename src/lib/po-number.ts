import { prisma } from "@/lib/prisma";

const PREFIX = "PO";
// Human-readable purchase orders start at PO1000 and count up.
const START = 1000;
const LOCK_KEY = 7723184502; // distinct from order-number lock

type Tx = Pick<typeof prisma, "purchaseOrder" | "$executeRaw">;

/**
 * Allocates the next PO number ("PO1000", "PO1001"…). Like nextOrderNumber,
 * we scan all matching numbers and find the max numerically so crossing a
 * digit-count boundary (e.g. PO9999 → PO10000) doesn't mis-order.
 */
export async function nextPoNumber(tx: Tx): Promise<string> {
  // $executeRaw (not $queryRaw) — pg_advisory_xact_lock returns void, which
  // $queryRaw can't deserialize. $executeRaw discards the row and just runs
  // the statement.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
  const rows = await tx.purchaseOrder.findMany({
    where: { poNumber: { startsWith: PREFIX } },
    select: { poNumber: true },
  });
  let maxSeq = START - 1;
  for (const r of rows) {
    if (!r.poNumber) continue;
    const n = parseInt(r.poNumber.slice(PREFIX.length), 10);
    if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
  }
  return `${PREFIX}${maxSeq + 1}`;
}
