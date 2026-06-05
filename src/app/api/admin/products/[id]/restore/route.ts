import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";
import { NAV_CACHE_TAG } from "@/lib/nav-cache";

// Restore a soft-deleted product. Clears deletedAt so the row reappears
// everywhere it was filtered out (storefront, search, admin lists, cart).
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const before = await prisma.product.findUnique({
    where: { id },
    select: { name: true, deletedAt: true, categoryId: true },
  });
  if (!before) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (!before.deletedAt) {
    return NextResponse.json({ ok: true, alreadyActive: true });
  }
  // If the parent category was soft-deleted in the meantime, restoring the
  // product alone would leave it orphaned (invisible on the storefront via
  // the category filter). Block this and ask the admin to restore the
  // category first.
  const cat = await prisma.category.findUnique({
    where: { id: before.categoryId },
    select: { deletedAt: true, name: true },
  });
  if (cat?.deletedAt) {
    return NextResponse.json(
      {
        error: `The parent category "${cat.name}" is also deleted. Restore the category first, then try again.`,
      },
      { status: 409 },
    );
  }
  await prisma.product.update({
    where: { id },
    data: { deletedAt: null },
  });
  revalidatePath("/");
  revalidatePath("/products");
  revalidateTag(NAV_CACHE_TAG);
  await logActivity(await auth(), {
    action: "restored",
    moduleKey: "product",
    target: before.name,
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
