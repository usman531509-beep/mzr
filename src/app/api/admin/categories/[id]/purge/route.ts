import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";
import { NAV_CACHE_TAG } from "@/lib/nav-cache";

// Hard-delete a soft-deleted category. Wipes the row outright so it
// disappears from the Deleted tab. Refuses if the row is still referenced:
//
//   • Live OR deleted child categories — purging would orphan the subtree.
//   • Products whose categoryId still points here (shouldn't happen — the
//     soft-delete handler nulls them out — but defensive).
//   • Products whose savedCategoryId snapshot still points here (those
//     would lose their "restore me to this category" hint).
//   • TradeDiscount rows tied to this category.
//
// Admin must remove or restore the dependents first. Refusal includes a
// human-readable list of blockers so they know exactly what's in the way.
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const before = await prisma.category.findUnique({
    where: { id },
    select: {
      name: true,
      deletedAt: true,
      _count: {
        select: {
          children: true,
          products: true,
          pendingProducts: true,
        },
      },
      tradeDiscount: { select: { id: true } },
    },
  });
  if (!before) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  if (!before.deletedAt) {
    return NextResponse.json(
      { error: "Category is still live. Move it to the Deleted tab first." },
      { status: 400 },
    );
  }

  const blockers: string[] = [];
  if (before._count.children > 0) {
    blockers.push(`${before._count.children} sub-categor${before._count.children === 1 ? "y" : "ies"} (delete or restore them first)`);
  }
  if (before._count.products > 0) {
    blockers.push(`${before._count.products} product${before._count.products === 1 ? "" : "s"} still attached`);
  }
  if (before._count.pendingProducts > 0) {
    blockers.push(`${before._count.pendingProducts} orphaned product${before._count.pendingProducts === 1 ? "" : "s"} waiting to be rehomed here`);
  }
  if (before.tradeDiscount) {
    blockers.push("a trade discount rule");
  }
  if (blockers.length > 0) {
    return NextResponse.json(
      {
        error: `Can't permanently delete — still referenced by ${blockers.join(", ")}. Clear those first.`,
      },
      { status: 409 },
    );
  }

  try {
    await prisma.category.delete({ where: { id } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hard delete failed";
    return NextResponse.json(
      { error: `Could not permanently delete: ${msg}` },
      { status: 409 },
    );
  }

  revalidateTag(NAV_CACHE_TAG);
  await logActivity(await auth(), {
    action: "purged",
    moduleKey: "category",
    target: before.name,
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
