import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";
import { consumeLayersFifo, refreshProductRetail, reverseLayerConsumption } from "@/lib/fifo";

const schema = z.object({
  status: z.enum(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]),
  // Optional shipment fields — required (and validated below) when status
  // transitions into SHIPPED.
  courierId: z.string().min(1).nullable().optional(),
  trackingNumber: z.string().min(1).max(120).nullable().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const newStatus = parsed.data.status;
  const courierId = parsed.data.courierId ?? null;
  const trackingNumber = parsed.data.trackingNumber?.trim() || null;

  let prevStatus: string | undefined;
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!current) throw new Error("Not found");
      prevStatus = current.status;

      // Stock + FIFO move on the CANCELLED boundary:
      //   - apply when an order leaves CANCELLED (or any legacy order with
      //     stockDeducted=false moves to a non-cancelled status — covers
      //     orders created before "reserve at create" landed)
      //   - reverse when an order enters CANCELLED with stock still deducted
      // All other transitions (PAID ↔ SHIPPED ↔ DELIVERED) leave stock and
      // FIFO untouched: the units stay reserved for the customer for the
      // full life of the order.
      const goingToCancelled = newStatus === "CANCELLED";
      const shouldApply   = !goingToCancelled && !current.stockDeducted;
      const shouldReverse =  goingToCancelled &&  current.stockDeducted;

      if (shouldApply) {
        for (const it of current.items) {
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: { decrement: it.quantity } },
          });
          await consumeLayersFifo(tx, {
            orderItemId: it.id,
            productId: it.productId,
            qty: it.quantity,
          });
          await refreshProductRetail(tx, it.productId);
        }
      } else if (shouldReverse) {
        for (const it of current.items) {
          await reverseLayerConsumption(tx, { orderItemId: it.id });
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: { increment: it.quantity } },
          });
          await refreshProductRetail(tx, it.productId);
        }
      }

      // Build the shipment patch. Entering SHIPPED requires a courier + tracking
      // number; leaving SHIPPED (or moving to CANCELLED) clears the shipment.
      const shipmentData: Record<string, unknown> = {};
      const enteringShipped = newStatus === "SHIPPED" && current.status !== "SHIPPED";
      if (enteringShipped) {
        if (!courierId || !trackingNumber) {
          throw new Error("Courier and tracking number are required to mark as shipped");
        }
        const courier = await tx.courier.findUnique({ where: { id: courierId }, select: { id: true } });
        if (!courier) throw new Error("Selected courier not found");
        shipmentData.courierId = courierId;
        shipmentData.trackingNumber = trackingNumber;
        shipmentData.shippedAt = new Date();
      } else if (newStatus === "CANCELLED") {
        shipmentData.courierId = null;
        shipmentData.trackingNumber = null;
        shipmentData.shippedAt = null;
      } else if (newStatus === "SHIPPED" && (courierId || trackingNumber)) {
        // Already shipped — allow updating courier/tracking inline.
        if (courierId) shipmentData.courierId = courierId;
        if (trackingNumber) shipmentData.trackingNumber = trackingNumber;
      }

      return tx.order.update({
        where: { id },
        data: {
          status: newStatus,
          stockDeducted: shouldApply ? true : shouldReverse ? false : current.stockDeducted,
          ...shipmentData,
        },
      });
    }, { maxWait: 10_000, timeout: 30_000 });

    if (prevStatus !== updated.status) {
      await logActivity(await auth(), {
        action: "status-changed",
        moduleKey: "order",
        target: `Order ${updated.orderNumber ?? `#${updated.id.slice(0, 8)}`}`,
        targetId: updated.id,
        meta: {
          changes: { status: { from: prevStatus, to: updated.status } },
          ...(updated.status === "SHIPPED"
            ? { courierId: updated.courierId, trackingNumber: updated.trackingNumber }
            : {}),
        },
      });
    }
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
