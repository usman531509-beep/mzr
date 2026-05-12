import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";

const schema = z.object({
  status: z.enum(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]),
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

  let prevStatus: string | undefined;
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!current) throw new Error("Not found");
      prevStatus = current.status;

      const wasDelivered = current.status === "DELIVERED";
      const willBeDelivered = newStatus === "DELIVERED";

      // Stock decrements happen on transition INTO delivered, increments on
      // transition OUT of delivered. The stockDeducted flag is a safety net
      // so we never double-deduct or double-restore.
      const decrement = willBeDelivered && !wasDelivered && !current.stockDeducted;
      const increment = wasDelivered && !willBeDelivered && current.stockDeducted;

      if (decrement) {
        for (const it of current.items) {
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: { decrement: it.quantity } },
          });
        }
      } else if (increment) {
        for (const it of current.items) {
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: { increment: it.quantity } },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: {
          status: newStatus,
          stockDeducted: decrement ? true : increment ? false : current.stockDeducted,
        },
      });
    });

    if (prevStatus !== updated.status) {
      await logActivity(await auth(), {
        action: "status-changed",
        moduleKey: "order",
        target: `Order ${updated.orderNumber ?? `#${updated.id.slice(0, 8)}`}`,
        targetId: updated.id,
        meta: { changes: { status: { from: prevStatus, to: updated.status } } },
      });
    }
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
