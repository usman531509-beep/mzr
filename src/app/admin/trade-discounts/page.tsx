import { prisma } from "@/lib/prisma";
import { TradeDiscountRow } from "@/components/admin/TradeDiscountRow";

export const dynamic = "force-dynamic";

export default async function TradeDiscountsPage() {
  const [categories, discounts] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true,
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    }),
    prisma.tradeDiscount.findMany(),
  ]);
  const map = new Map(discounts.map((d) => [d.categoryId, d.percent]));

  return (
    <div className="space-y-4">
      <div className="adm-top !mb-0">
        <div>
          <div className="crumb">Admin · Trade</div>
          <h1 className="font-bold">Trade Discounts</h1>
          <p className="text-sm text-muted-foreground">
            Set a percentage discount per category. Trade-approved customers will see
            the discounted price on the storefront alongside the original price.
          </p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Category</th>
              <th className="text-right">Products</th>
              <th className="w-[200px]">Discount %</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center text-sm text-muted-foreground">
                  No categories yet.
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td className="text-right text-sm text-muted-foreground">
                    {c._count.products}
                  </td>
                  <td>
                    <TradeDiscountRow
                      categoryId={c.id}
                      initial={map.get(c.id) ?? 0}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
