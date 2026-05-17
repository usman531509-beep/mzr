// One-shot: renumber every Order and PurchaseOrder so the sequence starts
// at MZR1000 / PO1000. Wraps the shared lib so the admin Migrations page
// and this CLI stay in sync.
//
// Run with:
//   DATABASE_URL="<prod>" DIRECT_URL="<prod-direct>" npx tsx scripts/renumber-orders-pos.ts

import { PrismaClient } from "@prisma/client";
import { renumberOrdersAndPos } from "../src/lib/migrations/renumber";

const db = new PrismaClient();

async function main() {
  const { log } = await renumberOrdersAndPos(db);
  for (const line of log) console.log(line);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
