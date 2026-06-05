import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trade Discounts</h1>
        <p className="text-sm text-muted-foreground">
          Set a percentage discount per category. Trade-approved customers will see
          the discounted price on the storefront alongside the original price.
        </p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead className="w-[200px]">Discount %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                  No categories yet.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {c._count.products}
                  </TableCell>
                  <TableCell>
                    <TradeDiscountRow
                      categoryId={c.id}
                      initial={map.get(c.id) ?? 0}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
