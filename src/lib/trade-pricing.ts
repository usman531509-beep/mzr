import { cache } from "react";
import { unstable_cache } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type TradeContext = {
  isTrader: boolean;
  /** Map of categoryId → effective discount percent (1–100). Every category
   *  that resolves to a discount is present, INCLUDING leaf categories that
   *  inherit it from an ancestor (see resolveCategoryDiscounts). Empty when
   *  not a trader. */
  discounts: Map<string, number>;
  /** Store-wide baseline discount applied to any category without its own. */
  globalPercent: number;
};

/** Products attach only to leaf categories, but admins usually set a trade
 *  discount on a parent (e.g. "BRAKES"), while the actual products live in its
 *  leaves ("DISCS", "BRAKE PADS"). This expands the raw per-category discount
 *  rows into an effective map covering every category: each one inherits the
 *  discount of its nearest ancestor that has an explicit row. A category's own
 *  discount always wins over an ancestor's. Only categories that resolve to a
 *  non-zero percent are stored, keeping the map small. */
export function resolveCategoryDiscounts(
  rows: { categoryId: string; percent: number }[],
  categories: { id: string; parentId: string | null }[],
): Map<string, number> {
  const direct = new Map(rows.map((r) => [r.categoryId, r.percent]));
  const parentOf = new Map(categories.map((c) => [c.id, c.parentId]));
  const resolved = new Map<string, number>();
  for (const c of categories) {
    let cur: string | null = c.id;
    let percent = 0;
    const guard = new Set<string>(); // defend against any accidental cycle
    while (cur && !guard.has(cur)) {
      guard.add(cur);
      const d = direct.get(cur);
      if (d !== undefined && d > 0) { percent = d; break; }
      cur = parentOf.get(cur) ?? null;
    }
    if (percent > 0) resolved.set(c.id, percent);
  }
  return resolved;
}

// Trade-discount rules are admin-set and change rarely. Cache the whole
// table + the global setting for 10 minutes, tagged so admin mutations can
// bust it on demand. Without this, every storefront render did a fresh
// findMany even though the data is essentially read-only.
export const TRADE_DISCOUNT_CACHE_TAG = "trade-discounts";
const getTradeDiscountData = unstable_cache(
  async () => {
    const [rows, categories, setting] = await Promise.all([
      prisma.tradeDiscount.findMany({ select: { categoryId: true, percent: true } }),
      prisma.category.findMany({ where: { deletedAt: null }, select: { id: true, parentId: true } }),
      prisma.tradeSetting.findUnique({
        where: { id: "global" },
        select: { globalPercent: true },
      }),
    ]);
    // Expand parent discounts down to their leaves before caching. Serialize
    // the Map to entries — unstable_cache stores JSON and a Map would be lost.
    const entries = [...resolveCategoryDiscounts(rows, categories).entries()];
    return { entries, globalPercent: setting?.globalPercent ?? 0 };
  },
  ["trade-discounts-v3"],
  { revalidate: 600, tags: [TRADE_DISCOUNT_CACHE_TAG] },
);

/** Server-only. The store-wide trade discount rules (category → effective
 *  percent map + global baseline), independent of who is viewing. Shared by
 *  the storefront context and every admin/checkout route that prices an order
 *  on behalf of a specific customer, so all of them resolve parent→leaf
 *  inheritance identically. */
export async function getTradeDiscountRules(): Promise<{
  discounts: Map<string, number>;
  globalPercent: number;
}> {
  const data = await getTradeDiscountData();
  return { discounts: new Map(data.entries), globalPercent: data.globalPercent };
}

/** Server-only. Resolves the current viewer's trade context.
 *  Wrapped in React.cache so multiple consumers in the same render tree
 *  share a single trip — e.g. layout + page both call this and only one
 *  auth() + Prisma lookup actually fires. */
export const getTradeContext = cache(async (): Promise<TradeContext> => {
  const session = await auth();
  if (!session?.user?.id) return { isTrader: false, discounts: new Map(), globalPercent: 0 };

  // User lookup must stay live (tradeApproved flips when admin approves an
  // application) but the discount rules can come straight from cache.
  const [user, rules] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tradeApproved: true, active: true },
    }),
    getTradeDiscountRules(),
  ]);
  if (!user?.active || !user.tradeApproved) {
    return { isTrader: false, discounts: new Map(), globalPercent: 0 };
  }
  return { isTrader: true, ...rules };
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
  // Priority: a category's own discount (a row only exists when > 0) wins;
  // otherwise the store-wide global discount applies to everything.
  const own = categoryId ? ctx.discounts.get(categoryId) : undefined;
  const percent = ctx.isTrader ? own ?? ctx.globalPercent : 0;
  if (percent <= 0) return { original: price, discounted: price, percent: 0 };
  const discounted = Math.max(0, +(price * (1 - percent / 100)).toFixed(2));
  return { original: price, discounted, percent };
}
