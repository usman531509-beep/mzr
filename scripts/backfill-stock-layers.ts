// One-shot: create StockLayer rows for pre-FIFO stock + reconcile current
// stock with layers + populate unitRetail on legacy layers. Wraps the
// shared lib so the admin Migrations page and this CLI stay in sync.
//
// Run with:
//   DATABASE_URL="<prod>" DIRECT_URL="<prod-direct>" npx tsx scripts/backfill-stock-layers.ts

import { PrismaClient } from "@prisma/client";
import { backfillStockLayers } from "../src/lib/migrations/backfill-stock-layers";

const db = new PrismaClient();

async function main() {
  const { log } = await backfillStockLayers(db);
  for (const line of log) console.log(line);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
