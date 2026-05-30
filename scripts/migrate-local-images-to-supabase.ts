/**
 * One-shot migration: re-uploads every product image that's still a local
 * dev path (`/uploads/<file>`) into the configured Supabase Storage bucket,
 * then rewrites the Product.images array to the new public URL.
 *
 * Usage (from the project root):
 *
 *   export DATABASE_URL="postgresql://postgres.<ref>:<pw>@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"
 *   export SUPABASE_URL="https://<ref>.supabase.co"
 *   export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
 *   export SUPABASE_BUCKET="products"   # optional, defaults to "products"
 *   npx tsx scripts/migrate-local-images-to-supabase.ts
 *
 * Idempotent — products whose image URLs are already absolute http(s) are
 * skipped. Safe to re-run if it crashes part-way through.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET ?? "products";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const prisma = new PrismaClient();
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

async function uploadOne(localPath: string): Promise<string | null> {
  // `localPath` looks like "/uploads/1777662781820-b5e993390e50.jpeg".
  const fileName = localPath.replace(/^\/uploads\//, "");
  const ext = path.extname(fileName).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  const diskPath = path.join(process.cwd(), "public", "uploads", fileName);
  let buf: Buffer;
  try {
    buf = await readFile(diskPath);
  } catch {
    console.warn(`  ⚠️  Missing local file ${diskPath} — skipping.`);
    return null;
  }

  const objectKey = `mzr-parts/${fileName}`;
  const { error: upErr } = await sb.storage.from(BUCKET).upload(objectKey, buf, {
    contentType,
    upsert: true, // idempotent — overwrites if a previous attempt half-finished
    cacheControl: "31536000",
  });
  if (upErr) {
    console.error(`  ❌ Upload failed for ${fileName}: ${upErr.message}`);
    return null;
  }
  const { data } = sb.storage.from(BUCKET).getPublicUrl(objectKey);
  return data.publicUrl;
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, images: true },
  });
  console.log(`Found ${products.length} products. Scanning images…`);

  let touched = 0;
  let uploaded = 0;
  let skipped = 0;

  for (const p of products) {
    const next: string[] = [];
    let changed = false;
    for (const url of p.images) {
      if (/^https?:\/\//i.test(url)) {
        next.push(url); // already remote
        skipped++;
        continue;
      }
      if (!url.startsWith("/uploads/")) {
        next.push(url); // unknown shape — leave alone
        skipped++;
        continue;
      }
      const newUrl = await uploadOne(url);
      if (newUrl) {
        next.push(newUrl);
        changed = true;
        uploaded++;
        console.log(`  ✓ ${p.name}: ${url} → ${newUrl}`);
      } else {
        next.push(url); // upload failed — keep the original so we can retry
      }
    }
    if (changed) {
      await prisma.product.update({
        where: { id: p.id },
        data: { images: next },
      });
      touched++;
    }
  }

  console.log("\nDone.");
  console.log(`  Products touched : ${touched}`);
  console.log(`  Images uploaded  : ${uploaded}`);
  console.log(`  Images skipped   : ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
