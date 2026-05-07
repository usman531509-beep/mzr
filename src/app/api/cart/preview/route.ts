import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    select: { id: true, price: true, categoryId: true },
  });

  let discounts = new Map<string, number>();
  if (target.tradeApproved) {
    const rows = await prisma.tradeDiscount.findMany();
    discounts = new Map(rows.map((r) => [r.categoryId, r.percent]));
  }

  const lines = items.map((i) => {
    const p = products.find((x) => x.id === i.productId);
    const base = p ? Number(p.price) : 0;
    const pct = p ? (discounts.get(p.categoryId) ?? 0) : 0;
    const price = pct > 0 ? +(base * (1 - pct / 100)).toFixed(2) : base;
    return { productId: i.productId, originalPrice: base, price, percent: pct };
  });

  return NextResponse.json({
    ok: true,
    isTrader: target.tradeApproved,
    lines,
  });
}
