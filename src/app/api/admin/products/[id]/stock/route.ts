import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

const schema = z.object({
  // Either set the stock absolutely, or apply a +/- delta. At least one
  // must be provided.
  setStock:        z.number().int().min(0).optional(),
  delta:           z.number().int().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
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

  const product = await prisma.product.findUnique({
    where: { id },
    select: { stock: true, lowStockThreshold: true },
  });
  if (!product) return NextResponse.json({ ok: false }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (d.setStock !== undefined) {
    data.stock = d.setStock;
  } else if (d.delta !== undefined) {
    data.stock = Math.max(0, product.stock + d.delta);
  }
  if (d.lowStockThreshold !== undefined) data.lowStockThreshold = d.lowStockThreshold;

  const updated = await prisma.product.update({
    where: { id },
    data,
    select: { name: true, stock: true, lowStockThreshold: true },
  });

  // Build a from/to record only for fields that actually changed.
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (updated.stock !== product.stock) {
    changes.stock = { from: product.stock, to: updated.stock };
  }
  if (updated.lowStockThreshold !== product.lowStockThreshold) {
    changes.lowStockThreshold = {
      from: product.lowStockThreshold,
      to: updated.lowStockThreshold,
    };
  }

  await logActivity(session, {
    action: "stock-updated",
    moduleKey: "stock",
    target: updated.name,
    targetId: id,
    meta: { changes },
  });
  return NextResponse.json({ ok: true });
}
