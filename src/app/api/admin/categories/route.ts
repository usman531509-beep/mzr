import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";
import { NAV_CACHE_TAG } from "@/lib/nav-cache";
import {
  joinPath, MAX_CATEGORY_DEPTH, uniqueChildSlug,
} from "@/lib/category-tree";

// Accept an absolute URL (Supabase/Cloudinary in prod) OR a root-relative
// path (the /uploads/… dev-disk fallback). A bare `.url()` would reject the
// latter and fail the save with a confusing "Invalid".
const imageUrlField = z
  .string()
  .refine((v) => /^(https?:\/\/|\/)/.test(v), "Must be a URL or path")
  .nullable()
  .optional();

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  imageUrl: imageUrlField,
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { name, description, imageUrl, parentId, sortOrder } = parsed.data;

  try {
    const created = await prisma.$transaction(async (tx) => {
      let parentPath: string | null = null;
      let parentDepth = -1;
      if (parentId) {
        const parent = await tx.category.findUnique({
          where: { id: parentId },
          select: { path: true, depth: true },
        });
        if (!parent) throw new Error("Parent category not found");
        parentPath = parent.path;
        parentDepth = parent.depth;
      }
      const depth = parentDepth + 1;
      if (depth > MAX_CATEGORY_DEPTH) {
        throw new Error(`Category depth exceeds the maximum of ${MAX_CATEGORY_DEPTH}`);
      }
      const slug = await uniqueChildSlug(tx, parentId ?? null, name);
      return tx.category.create({
        data: {
          name: name.trim(),
          slug,
          parentId: parentId ?? null,
          path: joinPath(parentPath, slug),
          depth,
          sortOrder: sortOrder ?? 0,
          description: description?.trim() || null,
          imageUrl: imageUrl || null,
        },
      });
    });
    revalidateTag(NAV_CACHE_TAG);
    await logActivity(await auth(), {
      action: "created",
      moduleKey: "category",
      target: created.name,
      targetId: created.id,
    });
    return NextResponse.json(created);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create" },
      { status: 400 },
    );
  }
}

// Soft-delete a category and every live sub-category in its subtree.
// Products are NOT deleted — instead, every product whose categoryId sits
// in the doomed subtree gets orphaned:
//   • savedCategoryId ← previous categoryId (so RESTORE can rehome it)
//   • categoryId      ← null              (so storefront category nav skips it)
// Products with a manually-set savedCategoryId from a prior deletion are
// not overwritten: their existing pending category wins, which matches the
// "last admin action sticks" rule.
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const cat = await prisma.category.findUnique({
    where: { id },
    select: { name: true, deletedAt: true, path: true },
  });
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cat.deletedAt) {
    return NextResponse.json({ ok: true, alreadyDeleted: true });
  }

  // Subtree matcher via denormalised path prefix — the node itself plus
  // every descendant. Live rows only so a re-delete after restore doesn't
  // shadow rows that had been deleted in an earlier batch.
  const subtreeCategoryWhere: Prisma.CategoryWhereInput = {
    deletedAt: null,
    OR: [{ id }, { path: { startsWith: `${cat.path}/` } }],
  };

  // Load the affected categories first so we can orphan each product with
  // an UPDATE per row (savedCategoryId = the actual categoryId). A single
  // updateMany can't set savedCategoryId = categoryId in SQL via Prisma, so
  // we batch the writes inside one transaction.
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const affectedCategories = await tx.category.findMany({
      where: subtreeCategoryWhere,
      select: { id: true },
    });
    const affectedIds = affectedCategories.map((c) => c.id);

    // Orphan products one categoryId at a time. The set of distinct
    // categoryIds is bounded by depth × siblings, so this stays tiny in
    // practice. Each call only touches rows that aren't already orphaned.
    let orphanedProducts = 0;
    for (const catId of affectedIds) {
      const r = await tx.product.updateMany({
        where: { categoryId: catId },
        data: { savedCategoryId: catId, categoryId: null },
      });
      orphanedProducts += r.count;
    }

    const catRes = await tx.category.updateMany({
      where: subtreeCategoryWhere,
      data: { deletedAt: now },
    });

    return {
      categoriesDeleted: catRes.count,
      orphanedProducts,
    };
  });

  revalidateTag(NAV_CACHE_TAG);
  await logActivity(await auth(), {
    action: "deleted",
    moduleKey: "category",
    target: cat.name,
    targetId: id,
    meta: { cascade: result },
  });
  return NextResponse.json({ ok: true, ...result });
}
