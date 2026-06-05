import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getFifoRetailBreakdown } from "@/lib/fifo";

export const dynamic = "force-dynamic";

const schema = z.object({
  forUserId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1),
  })).min(1),
});

// Admin-only. Returns line-item prices for the given cart as they would be
// applied to a specific customer (so the checkout UI can preview trade
// pricing before the admin places the order).
//
// Each cart line is priced using FIFO retail across the available stock
// layers — earlier batches contribute their `unitRetail`, newer batches
// theirs, so the preview total matches what the placed order will charge.
// We surface a single effective unit price (weighted average) per line to
// keep the response shape compatible with the existing checkout consumer.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { forUserId, items } = parsed.data;

  const target = await prisma.user.findUnique({
    where: { id: forUserId },
    select: { id: true, active: true, tradeApproved: true },
  });
  if (!target?.active) return NextResponse.json({ ok: false, error: "Customer not found" }, { status: 400 });

  // Soft-deleted products are silently dropped — any line whose productId
  // doesn't come back is treated as missing (priced 0) by the lookup below.
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, deletedAt: null },
    select: { id: true, price: true, categoryId: true },
  });

  let discounts = new Map<string, number>();
  if (target.tradeApproved) {
    const categoryIds = [...new Set(products.map((p) => p.categoryId))];
    if (categoryIds.length > 0) {
      const rows = await prisma.tradeDiscount.findMany({
        where: { categoryId: { in: categoryIds } },
        select: { categoryId: true, percent: true },
      });
      discounts = new Map(rows.map((r) => [r.categoryId, r.percent]));
    }
  }

  const lines = await Promise.all(items.map(async (i) => {
    const p = products.find((x) => x.id === i.productId);
    if (!p) {
      return { productId: i.productId, originalPrice: 0, price: 0, percent: 0 };
    }
    const pct = discounts.get(p.categoryId) ?? 0;
    const segments = await getFifoRetailBreakdown(prisma, {
      productId: p.id,
      qty: i.quantity,
      fallbackRetail: Number(p.price),
    });
    // Roll the per-batch retail up into a single effective unit price so the
    // checkout UI can render one row per cart line. The blended price is
    // exact when ordering at the displayed price across a single batch and
    // becomes a weighted average when the qty spans batches.
    let originalLineTotal = 0;
    let lineTotal = 0;
    for (const seg of segments) {
      const segPrice = pct > 0 ? +(seg.unitRetail * (1 - pct / 100)).toFixed(2) : seg.unitRetail;
      originalLineTotal += seg.unitRetail * seg.qty;
      lineTotal         += segPrice       * seg.qty;
    }
    const originalPrice = i.quantity > 0 ? +(originalLineTotal / i.quantity).toFixed(2) : 0;
    const price         = i.quantity > 0 ? +(lineTotal         / i.quantity).toFixed(2) : 0;
    return { productId: i.productId, originalPrice, price, percent: pct };
  }));

  return NextResponse.json({
    ok: true,
    isTrader: target.tradeApproved,
    lines,
  });
}
