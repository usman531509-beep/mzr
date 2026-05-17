import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { refreshProductRetail } from "@/lib/fifo";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  // qtyReceived can be edited (delta is applied to product.stock and
  // qtyRemaining), but it must remain >= already-consumed qty.
  qtyReceived: z.number().int().positive().max(1_000_000).optional(),
  unitCost:    z.number().nonnegative().max(10_000_000).optional(),
  unitRetail:  z.number().nonnegative().max(10_000_000).optional(),
  notes:       z.string().max(500).nullable().optional(),
});

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return null;
  return session;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await ensureAdmin();
  if (!session) return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  const { id } = await ctx.params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: `Invalid ${issue?.path.join(".") ?? "input"}: ${issue?.message}` },
      { status: 400 },
    );
  }
  const d = parsed.data;
  if (
    d.qtyReceived === undefined &&
    d.unitCost === undefined &&
    d.unitRetail === undefined &&
    d.notes === undefined
  ) {
    return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const layer = await tx.stockLayer.findUnique({
        where: { id },
        include: { product: { select: { name: true } } },
      });
      if (!layer) throw new Error("Batch not found");
      if (layer.source === "PURCHASE_ORDER") {
        throw new Error("PO-sourced batches are managed via the purchase order, not here.");
      }

      const consumed = layer.qtyReceived - layer.qtyRemaining;
      const before = {
        qtyReceived: layer.qtyReceived,
        qtyRemaining: layer.qtyRemaining,
        unitCost: Number(layer.unitCost),
        unitRetail: layer.unitRetail == null ? null : Number(layer.unitRetail),
        notes: layer.notes,
      };

      const data: Record<string, unknown> = {};
      let stockDelta = 0;

      if (d.qtyReceived !== undefined && d.qtyReceived !== layer.qtyReceived) {
        if (d.qtyReceived < consumed) {
          throw new Error(
            `Can't reduce received qty below ${consumed} — that many unit${consumed === 1 ? "" : "s"} ${consumed === 1 ? "has" : "have"} already been sold from this batch.`,
          );
        }
        data.qtyReceived  = d.qtyReceived;
        data.qtyRemaining = d.qtyReceived - consumed;
        stockDelta        = d.qtyReceived - layer.qtyReceived;
      }
      if (d.unitCost !== undefined && d.unitCost !== Number(layer.unitCost)) {
        data.unitCost = d.unitCost;
      }
      if (d.unitRetail !== undefined && d.unitRetail !== Number(layer.unitRetail ?? -1)) {
        data.unitRetail = d.unitRetail;
      }
      if (d.notes !== undefined) {
        const next = d.notes === "" ? null : d.notes;
        if (next !== layer.notes) data.notes = next;
      }

      if (Object.keys(data).length === 0) {
        return { layer, stockDelta: 0, before, after: before, name: layer.product.name };
      }

      const updated = await tx.stockLayer.update({
        where: { id },
        data,
        select: { qtyReceived: true, qtyRemaining: true, unitCost: true, unitRetail: true, notes: true },
      });

      if (stockDelta !== 0) {
        await tx.product.update({
          where: { id: layer.productId },
          data: { stock: { increment: stockDelta } },
        });
      }
      // Retail or qty changes can flip which layer is the oldest active.
      await refreshProductRetail(tx, layer.productId);

      return {
        layer,
        stockDelta,
        before,
        after: {
          qtyReceived: updated.qtyReceived,
          qtyRemaining: updated.qtyRemaining,
          unitCost: Number(updated.unitCost),
          unitRetail: updated.unitRetail == null ? null : Number(updated.unitRetail),
          notes: updated.notes,
        },
        name: layer.product.name,
      };
    });

    // Compute a from/to diff for the activity log.
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const k of ["qtyReceived", "qtyRemaining", "unitCost", "unitRetail", "notes"] as const) {
      const a = result.before[k];
      const b = result.after[k];
      if (a !== b) changes[k] = { from: a, to: b };
    }

    await logActivity(session, {
      action: "stock-received-updated",
      moduleKey: "stock-received",
      target: result.name,
      targetId: id,
      meta: { changes, stockDelta: result.stockDelta },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update batch";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await ensureAdmin();
  if (!session) return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  const { id } = await ctx.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const layer = await tx.stockLayer.findUnique({
        where: { id },
        include: {
          _count: { select: { allocations: true } },
          product: { select: { name: true } },
        },
      });
      if (!layer) throw new Error("Batch not found");
      if (layer.source === "PURCHASE_ORDER") {
        throw new Error("PO-sourced batches must be reversed via the PO (un-receive), not deleted here.");
      }
      if (layer._count.allocations > 0 || layer.qtyRemaining !== layer.qtyReceived) {
        const sold = layer.qtyReceived - layer.qtyRemaining;
        throw new Error(
          `Can't delete — ${sold} unit${sold === 1 ? "" : "s"} from this batch ${sold === 1 ? "has" : "have"} already been sold. Reverse the affected orders first.`,
        );
      }

      // Pull qty back out of product.stock, then drop the layer.
      await tx.product.update({
        where: { id: layer.productId },
        data: { stock: { decrement: layer.qtyReceived } },
      });
      await tx.stockLayer.delete({ where: { id } });
      // The deleted layer may have been the oldest active one → resync retail.
      await refreshProductRetail(tx, layer.productId);

      return {
        name: layer.product.name,
        qty: layer.qtyReceived,
        unitCost: Number(layer.unitCost),
        unitRetail: layer.unitRetail == null ? null : Number(layer.unitRetail),
      };
    });

    await logActivity(session, {
      action: "stock-received-deleted",
      moduleKey: "stock-received",
      target: `${result.name} − ${result.qty} units`,
      targetId: id,
      meta: { qty: result.qty, unitCost: result.unitCost, unitRetail: result.unitRetail },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not delete batch";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
