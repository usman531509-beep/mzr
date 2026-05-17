import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { refreshProductRetail } from "@/lib/fifo";

export const dynamic = "force-dynamic";

// Manual stock receipt. Independent of POs — admin picks a product, enters
// a quantity at a specific cost AND retail price. Each layer remembers its
// own retail so the catalogue keeps showing the older batch's price until
// that batch is depleted (FIFO retail).
const schema = z.object({
  productId:   z.string().min(1),
  quantity:    z.number().int().positive().max(1_000_000),
  costPrice:   z.number().nonnegative().max(10_000_000),
  retailPrice: z.number().nonnegative().max(10_000_000),
  notes:       z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: `Invalid ${issue?.path.join(".") ?? "input"}: ${issue?.message}` },
      { status: 400 },
    );
  }
  const d = parsed.data;

  try {
    const { layer, before, after } = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: d.productId },
        select: { id: true, name: true, stock: true, price: true, costPrice: true },
      });
      if (!product) throw new Error("Product not found");

      const before = {
        stock: product.stock,
        price: Number(product.price),
        costPrice: product.costPrice ? Number(product.costPrice) : null,
      };

      // New inventory layer carrying its own cost + retail. Older layers
      // keep their own prices; FIFO consumption pulls oldest-first.
      const layer = await tx.stockLayer.create({
        data: {
          productId:    d.productId,
          source:       "MANUAL_ADJUSTMENT",
          unitCost:     d.costPrice,
          unitRetail:   d.retailPrice,
          qtyReceived:  d.quantity,
          qtyRemaining: d.quantity,
          receivedAt:   new Date(),
          notes:        d.notes ?? null,
        },
        select: { id: true, receivedAt: true },
      });

      // Bump stock + refresh "current" costPrice (just a reference value).
      // We DON'T blindly overwrite product.price — refreshProductRetail
      // syncs it to the oldest active layer's unitRetail, which may still
      // be an older batch.
      await tx.product.update({
        where: { id: d.productId },
        data: {
          stock:     { increment: d.quantity },
          costPrice: d.costPrice,
        },
      });
      await refreshProductRetail(tx, d.productId);

      const updated = await tx.product.findUnique({
        where: { id: d.productId },
        select: { name: true, stock: true, price: true, costPrice: true },
      });

      return {
        layer,
        before,
        after: updated
          ? {
              stock:     updated.stock,
              price:     Number(updated.price),
              costPrice: updated.costPrice ? Number(updated.costPrice) : null,
            }
          : before,
      };
    });

    // Build a minimal from/to record of what actually changed.
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (before.stock     !== after.stock)     changes.stock     = { from: before.stock,     to: after.stock };
    if (before.price     !== after.price)     changes.price     = { from: before.price,     to: after.price };
    if (before.costPrice !== after.costPrice) changes.costPrice = { from: before.costPrice, to: after.costPrice };

    await logActivity(session, {
      action: "stock-received",
      moduleKey: "stock-received",
      target: `+${d.quantity} units @ ${d.costPrice.toFixed(2)}`,
      targetId: d.productId,
      meta: {
        layerId: layer.id,
        quantity: d.quantity,
        unitCost: d.costPrice,
        retailPrice: d.retailPrice,
        note: d.notes,
        changes,
      },
    });

    return NextResponse.json({ ok: true, layerId: layer.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not receive stock";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
