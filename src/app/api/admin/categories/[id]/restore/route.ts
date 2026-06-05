import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";
import { NAV_CACHE_TAG } from "@/lib/nav-cache";

// Restore a soft-deleted category and every deleted descendant.
// Rehoming rule for products:
//   • Any product still orphaned (categoryId IS NULL) whose savedCategoryId
//     matches one of the categories we're restoring gets its previous link
//     reinstated and its savedCategoryId cleared.
//   • Products that the admin has since manually reassigned to a different
//     category are left alone — manual action wins.
//
// If the parent is itself deleted we block: leaving a restored subtree
// disconnected from a still-deleted ancestor would orphan it in the
// storefront tree.
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const before = await prisma.category.findUnique({
    where: { id },
    select: { name: true, deletedAt: true, parentId: true, path: true },
  });
  if (!before) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  if (!before.deletedAt) {
    return NextResponse.json({ ok: true, alreadyActive: true });
  }
  if (before.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: before.parentId },
      select: { deletedAt: true, name: true },
    });
    if (parent?.deletedAt) {
      return NextResponse.json(
        {
          error: `The parent category "${parent.name}" is also deleted. Restore the parent first, then try again.`,
        },
        { status: 409 },
      );
    }
  }

  const subtreeCategoryWhere: Prisma.CategoryWhereInput = {
    deletedAt: { not: null },
    OR: [{ id }, { path: { startsWith: `${before.path}/` } }],
  };

  const result = await prisma.$transaction(async (tx) => {
    // Find the soft-deleted categories under this root and restore them
    // first so the FK from Product.categoryId → Category points at a live
    // row by the time we update products.
    const restoring = await tx.category.findMany({
      where: subtreeCategoryWhere,
      select: { id: true },
    });
    const restoringIds = restoring.map((c) => c.id);

    const catRes = await tx.category.updateMany({
      where: subtreeCategoryWhere,
      data: { deletedAt: null },
    });

    // Per category, rehome any still-orphaned product (categoryId IS NULL)
    // whose snapshot points back at this restored category. Manual moves
    // changed both categoryId AND savedCategoryId, so they fall out of
    // this filter naturally.
    let productsRehomed = 0;
    for (const catId of restoringIds) {
      const r = await tx.product.updateMany({
        where: { categoryId: null, savedCategoryId: catId },
        data: { categoryId: catId, savedCategoryId: null },
      });
      productsRehomed += r.count;
    }

    return {
      categoriesRestored: catRes.count,
      productsRehomed,
    };
  });

  revalidateTag(NAV_CACHE_TAG);
  await logActivity(await auth(), {
    action: "restored",
    moduleKey: "category",
    target: before.name,
    targetId: id,
    meta: { cascade: result },
  });
  return NextResponse.json({ ok: true, ...result });
}
