import { cache } from "react";
import { unstable_cache } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type TradeContext = {
  isTrader: boolean;
  /** Map of categoryId → discount percent (1–100). Empty when not a trader. */
  discounts: Map<string, number>;
};

// Trade-discount rules are admin-set and change rarely. Cache the whole
// table for 10 minutes, tagged so admin mutations can bust it on demand.
// Without this, every storefront render did a fresh findMany even though
// the data is essentially read-only.
export const TRADE_DISCOUNT_CACHE_TAG = "trade-discounts";
const getTradeDiscountRows = unstable_cache(
  async () => prisma.tradeDiscount.findMany({
    select: { categoryId: true, percent: true },
  }),
  ["trade-discounts-v1"],
  { revalidate: 600, tags: [TRADE_DISCOUNT_CACHE_TAG] },
);

/** Server-only. Resolves the current viewer's trade context.
 *  Wrapped in React.cache so multiple consumers in the same render tree
 *  share a single trip — e.g. layout + page both call this and only one
 *  auth() + Prisma lookup actually fires. */
export const getTradeContext = cache(async (): Promise<TradeContext> => {
  const session = await auth();
  if (!session?.user?.id) return { isTrader: false, discounts: new Map() };

  // User lookup must stay live (tradeApproved flips when admin approves an
  // application) but the discount rules can come straight from cache.
  const [user, rows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tradeApproved: true, active: true },
    }),
    getTradeDiscountRows(),
  ]);
  if (!user?.active || !user.tradeApproved) {
    return { isTrader: false, discounts: new Map() };
  }
  return {
    isTrader: true,
    discounts: new Map(rows.map((r) => [r.categoryId, r.percent])),
  };
});

/** Applies the trade discount (if any) for a given product + context.
 *  `categoryId` is nullable to handle orphaned products whose category was
 *  soft-deleted — those can't carry a category discount, so they're priced
 *  at retail until an admin reassigns them. */
export function tradePrice(
  price: number,
  categoryId: string | null,
  ctx: TradeContext,
): { original: number; discounted: number; percent: number } {
  const percent = ctx.isTrader && categoryId ? ctx.discounts.get(categoryId) ?? 0 : 0;
  if (percent <= 0) return { original: price, discounted: price, percent: 0 };
  const discounted = Math.max(0, +(price * (1 - percent / 100)).toFixed(2));
  return { original: price, discounted, percent };
}
