import type { PrismaClient } from "@prisma/client";
import type { MigrationSummary } from "./index";

// Idempotent migration that adds the `paymentToken` column to Order so admin-
// created orders can be paid via a public /pay/<token> link. Existing orders
// stay untouched (token = NULL), which is what we want — only admin-flow
// orders get a token.

export async function orderPaymentTokenMigration(
  db: PrismaClient,
): Promise<MigrationSummary> {
  const log: string[] = [];
  await db.$executeRawUnsafe(`
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentToken" TEXT
  `);
  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Order_paymentToken_key" ON "Order"("paymentToken")
  `);
  log.push("Order.paymentToken column + unique index ensured.");
  return { log, stats: {} };
}
