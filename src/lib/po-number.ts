import { prisma } from "@/lib/prisma";

const PREFIX = "PO";
const START = 5000001;
const LOCK_KEY = 7723184502; // distinct from order-number lock

type Tx = Pick<typeof prisma, "purchaseOrder" | "$executeRaw">;

export async function nextPoNumber(tx: Tx): Promise<string> {
  // $executeRaw (not $queryRaw) — pg_advisory_xact_lock returns void, which
  // $queryRaw can't deserialize. $executeRaw discards the row and just runs
  // the statement.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
  const last = await tx.purchaseOrder.findFirst({
    where: { poNumber: { startsWith: PREFIX } },
    orderBy: { poNumber: "desc" },
    select: { poNumber: true },
  });
  let seq = START;
  if (last?.poNumber) {
    const n = parseInt(last.poNumber.slice(PREFIX.length), 10);
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${PREFIX}${seq}`;
}
