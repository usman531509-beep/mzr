import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";
import { NAV_CACHE_TAG } from "@/lib/nav-cache";

// Hard-delete a soft-deleted product. Wipes the row from the DB so it
// disappears completely (including from the Deleted tab).
//
// The only relation that actually blocks deletion is `OrderItem` — its FK
// to Product defaults to Restrict, so Postgres refuses while any paid
// order references the row. Every other relation handles a product delete
// gracefully:
//
//   • StockLayer       — Cascade (FIFO layers vanish with the product)
//   • PurchaseOrderItem — SetNull (PO line survives, productId nulled)
//   • CartItem         — Cascade (transient state)
//   • WishlistItem     — SetNull (snapshot survives)
//   • ProductCompatibility — Cascade (fitments are scoped to the product)
//
// So the only safety check we need is "no order history". The user's
// expectation matches this — clearing stock doesn't matter, archived
// stock layers cascade harmlessly.
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const before = await prisma.product.findUnique({
    where: { id },
    select: {
      name: true,
      deletedAt: true,
      _count: { select: { orderItems: true } },
    },
  });
  if (!before) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  // Only allow purging products that are already soft-deleted. Stops an
  // accidental hard-delete from a misrouted UI button.
  if (!before.deletedAt) {
    return NextResponse.json(
      { error: "Product is still live. Move it to the Deleted tab first." },
      { status: 400 },
    );
  }

  if (before._count.orderItems > 0) {
    return NextResponse.json(
      {
        error: `Can't permanently delete — still referenced by ${before._count.orderItems} order line${before._count.orderItems === 1 ? "" : "s"}. Keep it soft-deleted to preserve order history.`,
      },
      { status: 409 },
    );
  }

  try {
    await prisma.product.delete({ where: { id } });
  } catch (e) {
    // Catch any remaining FK violation we didn't explicitly check (e.g.
    // a relation added later) and surface a clean message.
    const msg = e instanceof Error ? e.message : "Hard delete failed";
    return NextResponse.json(
      { error: `Could not permanently delete: ${msg}` },
      { status: 409 },
    );
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidateTag(NAV_CACHE_TAG);
  await logActivity(await auth(), {
    action: "purged",
    moduleKey: "product",
    target: before.name,
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
