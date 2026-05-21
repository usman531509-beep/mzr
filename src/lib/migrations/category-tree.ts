import type { PrismaClient } from "@prisma/client";
import type { MigrationSummary } from "./index";

// One-shot DDL+backfill migration that converts the flat `Category` table to
// the tree shape (parentId / path / depth / sortOrder). Idempotent: every
// statement uses IF NOT EXISTS / IF EXISTS so re-running is a no-op.
//
// On a fresh prod build `prisma db push` has already added the columns, so
// this migration's job collapses to "backfill path/depth for any row where
// they're still NULL or 0 with no parent".

export async function categoryTreeMigration(
  db: PrismaClient,
): Promise<MigrationSummary> {
  const log: string[] = [];
  const stats: Record<string, number> = {};

  // 1. Make sure the columns exist (covers the case where prisma db push
  //    hasn't run yet for some reason — paranoia).
  await db.$executeRawUnsafe(`
    ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "parentId" TEXT
  `);
  await db.$executeRawUnsafe(`
    ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "path" TEXT
  `);
  await db.$executeRawUnsafe(`
    ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "depth" INTEGER NOT NULL DEFAULT 0
  `);
  await db.$executeRawUnsafe(`
    ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0
  `);

  // 2. Backfill: every row whose `path` is NULL gets `path = slug`. All
  //    existing rows become top-level (parentId = NULL, depth = 0).
  const backfilled = await db.$executeRawUnsafe(`
    UPDATE "Category" SET "path" = "slug" WHERE "path" IS NULL
  `);
  stats.backfilledPaths = Number(backfilled);
  log.push(`Backfilled path = slug on ${backfilled} row(s).`);

  // 3. Enforce NOT NULL once every row has a value.
  await db.$executeRawUnsafe(`
    ALTER TABLE "Category" ALTER COLUMN "path" SET NOT NULL
  `);

  // 4. Drop the legacy global-unique indexes and add the tree-aware ones.
  await db.$executeRawUnsafe(`DROP INDEX IF EXISTS "Category_name_key"`);
  await db.$executeRawUnsafe(`DROP INDEX IF EXISTS "Category_slug_key"`);
  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Category_path_key" ON "Category"("path")
  `);
  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Category_parentId_slug_key"
      ON "Category"("parentId","slug")
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Category_parentId_idx" ON "Category"("parentId")
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Category_path_idx" ON "Category"("path")
  `);

  // 5. Add the self-FK only if missing — pg_constraint name must match the
  //    Prisma-generated style so `prisma db push` doesn't try to recreate it.
  await db.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Category_parentId_fkey'
      ) THEN
        ALTER TABLE "Category"
          ADD CONSTRAINT "Category_parentId_fkey"
          FOREIGN KEY ("parentId") REFERENCES "Category"("id")
          ON DELETE NO ACTION ON UPDATE CASCADE;
      END IF;
    END$$
  `);

  const total = await db.category.count();
  stats.totalCategories = total;
  log.push(`Done. ${total} category row(s) live in the tree.`);
  return { log, stats };
}
