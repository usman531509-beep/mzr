// One-shot: assign MZR4000001-style orderNumber to any order that's still
// NULL (i.e. created before the orderNumber column existed). Idempotent —
// safe to re-run; orders that already have a number are skipped.
//
// Run with:
//   DATABASE_URL="<prod>" DIRECT_URL="<prod-direct>" npx tsx scripts/backfill-order-numbers.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const PREFIX = "MZR";
const START = 4000001;

async function main() {
  // Highest existing number so we keep the sequence contiguous.
  const last = await db.order.findFirst({
    where: { orderNumber: { startsWith: PREFIX } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  let seq = START;
  if (last?.orderNumber) {
    const n = parseInt(last.orderNumber.slice(PREFIX.length), 10);
    if (Number.isFinite(n)) seq = n + 1;
  }

  // Process oldest-first so older orders get lower numbers — matches what the
  // sequence would have produced if it had existed all along.
  const legacy = await db.order.findMany({
    where: { orderNumber: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true, customerName: true },
  });

  if (legacy.length === 0) {
    console.log("Nothing to backfill — every order already has an orderNumber.");
    return;
  }

  console.log(`Backfilling ${legacy.length} order(s) starting at ${PREFIX}${seq}…`);
  for (const o of legacy) {
    const num = `${PREFIX}${seq}`;
    await db.order.update({ where: { id: o.id }, data: { orderNumber: num } });
    console.log(`  ${num} ← ${o.id.slice(0, 8)}…  (${o.customerName}, ${o.createdAt.toISOString().slice(0, 10)})`);
    seq++;
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
