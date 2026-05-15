import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["DRAFT", "PLACED", "RECEIVED", "CANCELLED"]).optional(),
  notes: z.string().max(2000).nullable().optional(),
  expectedAt: z.string().nullable().optional(),
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
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  const d = parsed.data;

  let prevStatus: string | undefined;
  let newStatus: string | undefined;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!current) throw new Error("Not found");
      prevStatus = current.status;

      const data: Record<string, unknown> = {};
      if (d.notes !== undefined) data.notes = d.notes;
      if (d.expectedAt !== undefined) {
        data.expectedAt = d.expectedAt ? parseLocalDate(d.expectedAt) : null;
      }
      if (d.status !== undefined) data.status = d.status;

      const willBeReceived = d.status === "RECEIVED";
      const wasReceived = current.status === "RECEIVED";

      // Stock applied on the way in, restored on the way out.
      const apply = willBeReceived && !wasReceived && !current.stockReceived;
      const restore = wasReceived && !willBeReceived && current.stockReceived;

      if (apply) {
        for (const it of current.items) {
          if (it.productId) {
            await tx.product.update({
              where: { id: it.productId },
              data: { stock: { increment: it.quantity } },
            });
          }
        }
        data.stockReceived = true;
        data.receivedAt = new Date();
      } else if (restore) {
        for (const it of current.items) {
          if (it.productId) {
            await tx.product.update({
              where: { id: it.productId },
              data: { stock: { decrement: it.quantity } },
            });
          }
        }
        data.stockReceived = false;
        data.receivedAt = null;
      }

      const after = await tx.purchaseOrder.update({ where: { id }, data });
      newStatus = after.status;
      return after;
    });

    if (d.status !== undefined && prevStatus !== newStatus) {
      await logActivity(session, {
        action: "status-changed",
        moduleKey: "purchase-order",
        target: updated.poNumber,
        targetId: id,
        meta: { changes: { status: { from: prevStatus, to: newStatus } } },
      });
    } else {
      await logActivity(session, {
        action: "updated",
        moduleKey: "purchase-order",
        target: updated.poNumber,
        targetId: id,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
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
  const before = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: { poNumber: true, stockReceived: true },
  });
  if (!before) return NextResponse.json({ ok: false }, { status: 404 });
  if (before.stockReceived) {
    return NextResponse.json(
      { ok: false, error: "Can't delete a received PO. Cancel it instead." },
      { status: 400 },
    );
  }
  await prisma.purchaseOrder.delete({ where: { id } });
  await logActivity(session, {
    action: "deleted",
    moduleKey: "purchase-order",
    target: before.poNumber,
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}

function parseLocalDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return new Date("invalid");
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
