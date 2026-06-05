-- Idempotent pre-deploy migrations.
-- This file is run via `prisma db execute` BEFORE `prisma db push` as part of
-- the build script. Its only job is to bridge data-shape changes that
-- `prisma db push` can't handle on its own — primarily NOT-NULL-without-
-- default columns on populated tables, and unique-key reshuffles.
--
-- Every block is wrapped in an EXISTS guard so it's safe on a fresh
-- database (no tables yet, prisma db push will create everything cleanly)
-- and equally safe on a DB where this script has already run before.

DO $$
BEGIN
  ----------------------------------------------------------------------------
  -- Category: flat -> tree
  -- Adds parentId / path / depth / sortOrder, backfills path = slug for
  -- every existing row, swaps the legacy global-unique indexes for the
  -- tree-aware composites. Without this, `db push` cannot apply the new
  -- "path String @unique" column because populated rows have no default.
  ----------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Category'
  ) THEN
    ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "parentId"  TEXT;
    ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "path"      TEXT;
    ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "depth"     INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

    UPDATE "Category" SET "path" = "slug" WHERE "path" IS NULL;
    ALTER TABLE "Category" ALTER COLUMN "path" SET NOT NULL;

    DROP INDEX IF EXISTS "Category_name_key";
    DROP INDEX IF EXISTS "Category_slug_key";

    CREATE UNIQUE INDEX IF NOT EXISTS "Category_path_key"
      ON "Category"("path");
    CREATE UNIQUE INDEX IF NOT EXISTS "Category_parentId_slug_key"
      ON "Category"("parentId","slug");
    CREATE INDEX IF NOT EXISTS "Category_parentId_idx"
      ON "Category"("parentId");
    CREATE INDEX IF NOT EXISTS "Category_path_idx"
      ON "Category"("path");

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'Category_parentId_fkey'
    ) THEN
      ALTER TABLE "Category"
        ADD CONSTRAINT "Category_parentId_fkey"
        FOREIGN KEY ("parentId") REFERENCES "Category"("id")
        ON DELETE NO ACTION ON UPDATE CASCADE;
    END IF;
  END IF;

  ----------------------------------------------------------------------------
  -- Product.demanding — admin-curated "in demand" flag that drives the
  -- home-page promo banner. Nullable + default false, but pre-creating means
  -- the column exists before any user-facing route reads it.
  ----------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Product'
  ) THEN
    ALTER TABLE "Product"
      ADD COLUMN IF NOT EXISTS "demanding" BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS "Product_demanding_idx"
      ON "Product"("demanding");
  END IF;

  ----------------------------------------------------------------------------
  -- ProductBrand — manufacturer of the part (Brembo, NGK, EBC). Lives
  -- alongside the existing `Brand` table which is now reserved for bike-
  -- make brands (Honda, Yamaha) used by BikeModel and Product.brand.
  ----------------------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS "ProductBrand" (
    "id"        TEXT      PRIMARY KEY,
    "name"      TEXT      NOT NULL,
    "slug"      TEXT      NOT NULL,
    "logoUrl"   TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "ProductBrand_name_key"
    ON "ProductBrand"("name");
  CREATE UNIQUE INDEX IF NOT EXISTS "ProductBrand_slug_key"
    ON "ProductBrand"("slug");

  -- Product.productBrandId — nullable so existing rows keep working until
  -- an admin tags them. Soft FK so deleting the brand orphans the column
  -- to NULL rather than blocking the delete.
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Product'
  ) THEN
    ALTER TABLE "Product"
      ADD COLUMN IF NOT EXISTS "productBrandId" TEXT;
    CREATE INDEX IF NOT EXISTS "Product_productBrandId_idx"
      ON "Product"("productBrandId");
    -- Add the FK in a guarded DO block so re-runs don't conflict.
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'Product_productBrandId_fkey'
    ) THEN
      ALTER TABLE "Product"
        ADD CONSTRAINT "Product_productBrandId_fkey"
        FOREIGN KEY ("productBrandId") REFERENCES "ProductBrand"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;

  ----------------------------------------------------------------------------
  -- TradeAccountRequest — UK address fields. The form was extended to
  -- capture full UK postal addresses (line 2, county, postcode) on top of
  -- the original `address`/`city`/`country` triple.
  ----------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'TradeAccountRequest'
  ) THEN
    ALTER TABLE "TradeAccountRequest"
      ADD COLUMN IF NOT EXISTS "addressLine2" TEXT;
    ALTER TABLE "TradeAccountRequest"
      ADD COLUMN IF NOT EXISTS "county" TEXT;
    ALTER TABLE "TradeAccountRequest"
      ADD COLUMN IF NOT EXISTS "postcode" TEXT;
  END IF;

  ----------------------------------------------------------------------------
  -- Product.deletedAt / Category.deletedAt — soft-delete tombstones. Products
  -- and categories that have order history can't be hard-deleted (FK Restrict
  -- on OrderItem.product), so the admin "Delete" action now stamps deletedAt
  -- and filters those rows out of every storefront + admin list. Nullable +
  -- no default, so `db push` can apply this safely to populated tables.
  ----------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Product'
  ) THEN
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
    CREATE INDEX IF NOT EXISTS "Product_deletedAt_idx" ON "Product"("deletedAt");

    -- Orphan + remember: a product can now survive its category being soft-
    -- deleted. The DELETE handler nulls Product.categoryId and stashes the
    -- previous value in savedCategoryId. RESTORE moves it back. Both
    -- columns nullable + no default so this applies cleanly to populated
    -- tables. categoryId loses its NOT NULL.
    ALTER TABLE "Product" ALTER COLUMN "categoryId" DROP NOT NULL;
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "savedCategoryId" TEXT;
    CREATE INDEX IF NOT EXISTS "Product_savedCategoryId_idx" ON "Product"("savedCategoryId");
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'Product_savedCategoryId_fkey'
    ) THEN
      ALTER TABLE "Product"
        ADD CONSTRAINT "Product_savedCategoryId_fkey"
        FOREIGN KEY ("savedCategoryId") REFERENCES "Category"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Category'
  ) THEN
    ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
    CREATE INDEX IF NOT EXISTS "Category_deletedAt_idx" ON "Category"("deletedAt");
  END IF;

  ----------------------------------------------------------------------------
  -- Order.paymentToken — opaque resume token for unpaid orders.
  -- Nullable, so db push could add this itself, but pre-creating means
  -- the column + unique index exist before any user-facing route reads it.
  ----------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Order'
  ) THEN
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentToken" TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS "Order_paymentToken_key"
      ON "Order"("paymentToken");
  END IF;
END$$;
