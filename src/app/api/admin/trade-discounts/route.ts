import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { TRADE_DISCOUNT_CACHE_TAG } from "@/lib/trade-pricing";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const body = (await req.json()) as { categoryId?: string; percent?: number | null };
  if (!body.categoryId) {
    return NextResponse.json({ ok: false, error: "categoryId required" }, { status: 400 });
  }

  // null / 0 / undefined → remove the discount; otherwise upsert.
  const percent = typeof body.percent === "number" ? Math.round(body.percent) : 0;
  const [cat, existing] = await Promise.all([
    prisma.category.findUnique({ where: { id: body.categoryId }, select: { name: true } }),
    prisma.tradeDiscount.findUnique({ where: { categoryId: body.categoryId }, select: { percent: true } }),
  ]);
  const prevPercent = existing?.percent ?? 0;

  if (!percent || percent < 0) {
    await prisma.tradeDiscount.deleteMany({ where: { categoryId: body.categoryId } });
    revalidateTag(TRADE_DISCOUNT_CACHE_TAG);
    await logActivity(session, {
      action: "discount-removed",
      moduleKey: "trade-discount",
      target: cat?.name ?? body.categoryId,
      targetId: body.categoryId,
      meta: { changes: { percent: { from: prevPercent, to: 0 } } },
    });
    return NextResponse.json({ ok: true });
  }
  if (percent > 100) {
    return NextResponse.json({ ok: false, error: "Percent must be 0–100" }, { status: 400 });
  }
  await prisma.tradeDiscount.upsert({
    where: { categoryId: body.categoryId },
    create: { categoryId: body.categoryId, percent },
    update: { percent },
  });
  revalidateTag(TRADE_DISCOUNT_CACHE_TAG);
  await logActivity(session, {
    action: "discount-set",
    moduleKey: "trade-discount",
    target: cat?.name ?? body.categoryId,
    targetId: body.categoryId,
    meta: { changes: { percent: { from: prevPercent, to: percent } } },
  });
  return NextResponse.json({ ok: true });
}
