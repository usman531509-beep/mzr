import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { createManualLayer, consumeLayersForWriteOff, refreshProductRetail } from "@/lib/fifo";

export const dynamic = "force-dynamic";

const schema = z.object({
  // Either set the stock absolutely, or apply a +/- delta. At least one
  // must be provided.
  setStock:        z.number().int().min(0).optional(),
  delta:           z.number().int().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  // Optional admin note explaining the manual adjustment — stored on the
  // resulting StockLayer / write-off so auditors know why it happened.
  note: z.string().max(500).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  const d = parsed.data;
  if (d.setStock === undefined && d.delta === undefined && d.lowStockThreshold === undefined) {
    return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id },
        select: { stock: true, lowStockThreshold: true, name: true },
      });
      if (!product) throw new Error("Product not found");

      const data: Record<string, unknown> = {};
      // Decide the target stock value and the net delta we need to apply to
      // the FIFO layers.
      let stockDelta = 0;
      if (d.setStock !== undefined) {
        data.stock = d.setStock;
        stockDelta = d.setStock - product.stock;
      } else if (d.delta !== undefined) {
        const next = Math.max(0, product.stock + d.delta);
        data.stock = next;
        stockDelta = next - product.stock;
      }
      if (d.lowStockThreshold !== undefined) data.lowStockThreshold = d.lowStockThreshold;

      // Apply the FIFO side: positive delta = new manual layer at current
      // costPrice; negative delta = write-off consuming oldest layers first.
      if (stockDelta > 0) {
        await createManualLayer(tx, {
          productId: id,
          quantity: stockDelta,
          notes: d.note,
        });
      } else if (stockDelta < 0) {
        await consumeLayersForWriteOff(tx, {
          productId: id,
          qty: -stockDelta,
        });
      }

      const updated = await tx.product.update({
        where: { id },
        data,
        select: { name: true, stock: true, lowStockThreshold: true },
      });

      // If the delta moved us across a batch boundary (or created a new one),
      // sync the displayed retail to whichever layer is now oldest in stock.
      if (stockDelta !== 0) {
        await refreshProductRetail(tx, id);
      }

      return { product, updated, stockDelta };
    });

    // Build a from/to record only for fields that actually changed.
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (result.updated.stock !== result.product.stock) {
      changes.stock = { from: result.product.stock, to: result.updated.stock };
    }
    if (result.updated.lowStockThreshold !== result.product.lowStockThreshold) {
      changes.lowStockThreshold = {
        from: result.product.lowStockThreshold,
        to: result.updated.lowStockThreshold,
      };
    }

    await logActivity(session, {
      action: "stock-updated",
      moduleKey: "stock",
      target: result.updated.name,
      targetId: id,
      meta: { changes, note: d.note ?? undefined, layerDelta: result.stockDelta },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
