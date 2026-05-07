import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type TradeContext = {
  isTrader: boolean;
  /** Map of categoryId → discount percent (1–100). Empty when not a trader. */
  discounts: Map<string, number>;
};

/** Server-only. Resolves the current viewer's trade context once per request. */
export async function getTradeContext(): Promise<TradeContext> {
  const session = await auth();
  if (!session?.user?.id) return { isTrader: false, discounts: new Map() };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tradeApproved: true, active: true },
  });
  if (!user?.active || !user.tradeApproved) {
    return { isTrader: false, discounts: new Map() };
  }

  const rows = await prisma.tradeDiscount.findMany({
    select: { categoryId: true, percent: true },
  });
  return {
    isTrader: true,
    discounts: new Map(rows.map((r) => [r.categoryId, r.percent])),
  };
}

/** Applies the trade discount (if any) for a given product + context. */
export function tradePrice(
  price: number,
  categoryId: string,
  ctx: TradeContext,
): { original: number; discounted: number; percent: number } {
  const percent = ctx.isTrader ? ctx.discounts.get(categoryId) ?? 0 : 0;
  if (percent <= 0) return { original: price, discounted: price, percent: 0 };
  const discounted = Math.max(0, +(price * (1 - percent / 100)).toFixed(2));
  return { original: price, discounted, percent };
}
