// One-shot: assign MZR numbers to any order with orderNumber=NULL. Wraps
// the shared lib so the admin Migrations page and this CLI stay in sync.
//
// Run with:
//   DATABASE_URL="<prod>" DIRECT_URL="<prod-direct>" npx tsx scripts/backfill-order-numbers.ts

import { PrismaClient } from "@prisma/client";
import { backfillOrderNumbers } from "../src/lib/migrations/backfill-order-numbers";

const db = new PrismaClient();

async function main() {
  const { log } = await backfillOrderNumbers(db);
  for (const line of log) console.log(line);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
