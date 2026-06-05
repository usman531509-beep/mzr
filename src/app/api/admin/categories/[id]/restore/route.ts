import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";
import { NAV_CACHE_TAG } from "@/lib/nav-cache";

// Restore a soft-deleted category. Clears deletedAt so it reappears in
// storefront nav, admin trees, and product pickers. If the parent category
// is itself deleted, we block — the admin must restore the parent first
// to avoid leaving an orphan in the tree.
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const before = await prisma.category.findUnique({
    where: { id },
    select: { name: true, deletedAt: true, parentId: true },
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
  await prisma.category.update({
    where: { id },
    data: { deletedAt: null },
  });
  revalidateTag(NAV_CACHE_TAG);
  await logActivity(await auth(), {
    action: "restored",
    moduleKey: "category",
    target: before.name,
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
