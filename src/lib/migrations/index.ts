// Shared one-shot data migrations. Each function takes a Prisma client (so
// it works equally from a CLI script with `new PrismaClient()` or from a
// server route with the singleton) and returns a Summary the caller can
// log / surface in the UI. All are idempotent — safe to re-run.

import type { PrismaClient } from "@prisma/client";

export type MigrationSummary = {
  log: string[];
  stats: Record<string, number>;
};

export type MigrationName =
  | "renumber-orders-pos"
  | "backfill-order-numbers"
  | "backfill-stock-layers";

export const MIGRATIONS: Array<{
  name: MigrationName;
  label: string;
  description: string;
}> = [
  {
    name: "renumber-orders-pos",
    label: "Renumber orders & POs",
    description:
      "Resequence every Order and PurchaseOrder to start at MZR1000 / PO1000 (oldest first). Idempotent.",
  },
  {
    name: "backfill-order-numbers",
    label: "Backfill missing order numbers",
    description:
      "Assign an MZR number to any legacy order created before the orderNumber column existed.",
  },
  {
    name: "backfill-stock-layers",
    label: "Backfill stock layers",
    description:
      "Create StockLayer rows for RECEIVED POs and an INITIAL layer for any unaccounted-for stock. Populates unitRetail on legacy layers.",
  },
];

export { renumberOrdersAndPos } from "./renumber";
export { backfillOrderNumbers } from "./backfill-order-numbers";
export { backfillStockLayers }  from "./backfill-stock-layers";

import { renumberOrdersAndPos }   from "./renumber";
import { backfillOrderNumbers }   from "./backfill-order-numbers";
import { backfillStockLayers }    from "./backfill-stock-layers";

export async function runMigration(
  db: PrismaClient,
  name: MigrationName,
): Promise<MigrationSummary> {
  switch (name) {
    case "renumber-orders-pos":   return renumberOrdersAndPos(db);
    case "backfill-order-numbers": return backfillOrderNumbers(db);
    case "backfill-stock-layers": return backfillStockLayers(db);
    default: {
      const _exhaust: never = name;
      throw new Error(`Unknown migration: ${_exhaust as string}`);
    }
  }
}
