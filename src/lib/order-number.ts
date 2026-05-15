import { prisma } from "@/lib/prisma";

const PREFIX = "MZR";
const START = 4000001;

// Advisory lock key — any constant int. Serializes order-number generation
// across concurrent transactions so two simultaneous orders can't pick the
// same number.
const LOCK_KEY = 7723184501;

type Tx = Pick<typeof prisma, "order" | "$executeRaw">;

/**
 * Allocates the next human-readable order number ("MZR4000001"). Must be
 * called inside a transaction. Uses a Postgres advisory lock so two callers
 * can't both read the same MAX(seq).
 */
export async function nextOrderNumber(tx: Tx): Promise<string> {
  // Lock for the duration of the surrounding transaction. Use $executeRaw —
  // pg_advisory_xact_lock returns void, which $queryRaw can't deserialize.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;

  const last = await tx.order.findFirst({
    where: { orderNumber: { startsWith: PREFIX } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  let seq = START;
  if (last?.orderNumber) {
    const n = parseInt(last.orderNumber.slice(PREFIX.length), 10);
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${PREFIX}${seq}`;
}
