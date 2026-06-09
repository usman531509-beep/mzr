import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/admin/StatCard";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  TrendingUp, TrendingDown, Receipt, PoundSterling, Percent,
} from "lucide-react";
import { ReportHeader } from "@/components/admin/reports/ReportHeader";
import { resolveRange } from "@/lib/reports/date-range";
import { requireReportAccess } from "@/lib/reports/auth";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

// Financial / P&L report — the headline accountant view.
//
//   Revenue                  = SUM(Order.total) where status=DELIVERED
//   COGS                     = SUM(allocation.qty × allocation.unitCost)
//                              with fallback to Product.costPrice when no
//                              FIFO allocations exist for the line.
//   Gross profit             = Revenue − COGS
//   Expenses                 = SUM(Expense.amount) paid in range
//   Net profit               = Gross profit − Expenses
//   VAT (collected)          = 20% of (subtotal + shipping − discount)
//                              — mirrors checkout math exactly.
export default async function FinancialReport({ searchParams }: { searchParams: SP }) {
  const session = await requireReportAccess("reports.financial");
  if (!session) redirect("/admin");

  const sp = await searchParams;
  const range = resolveRange(sp);
  const orderWhere = range.from && range.to
    ? { createdAt: { gte: range.from, lte: range.to }, status: "DELIVERED" as const }
    : { status: "DELIVERED" as const };
  const itemWhere = range.from && range.to
    ? { order: { is: { createdAt: { gte: range.from, lte: range.to }, status: "DELIVERED" as const } } }
    : { order: { is: { status: "DELIVERED" as const } } };
  const expenseWhere = range.from && range.to
    ? { paidOn: { gte: range.from, lte: range.to } }
    : {};

  const [orderAgg, items, expenseAgg, expensesByCategory] = await Promise.all([
    prisma.order.aggregate({
      where: orderWhere,
      _sum: { total: true, shippingFee: true, discount: true },
      _count: { _all: true },
    }),
    prisma.orderItem.findMany({
      where: itemWhere,
      select: {
        quantity: true, price: true,
        product: { select: { costPrice: true } },
        costAllocations: { select: { qty: true, unitCost: true } },
      },
    }),
    prisma.expense.aggregate({
      where: expenseWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: expenseWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  // ---- Revenue / shipping / discount -----------------------------------
  const revenue   = Number(orderAgg._sum.total       ?? 0);
  const shipping  = Number(orderAgg._sum.shippingFee ?? 0);
  const discounts = Number(orderAgg._sum.discount    ?? 0);
  const orderCount = orderAgg._count._all;

  // ---- COGS (FIFO with cost-price fallback) ----------------------------
  let cogs = 0;
  let unitsSold = 0;
  let itemsMissingCost = 0;
  let lineSubtotal = 0;
  for (const it of items) {
    const sell = Number(it.price);
    lineSubtotal += sell * it.quantity;
    unitsSold += it.quantity;
    if (it.costAllocations.length > 0) {
      for (const a of it.costAllocations) cogs += Number(a.unitCost) * a.qty;
      continue;
    }
    if (it.product.costPrice == null) {
      itemsMissingCost += it.quantity;
      continue;
    }
    cogs += Number(it.product.costPrice) * it.quantity;
  }
  const grossProfit = revenue - cogs;
  const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  // ---- VAT (matches checkout: subtotal + shipping − discount × 20%) ----
  const vatBase = Math.max(0, lineSubtotal + shipping - discounts);
  const vatCollected = +(vatBase * 0.2).toFixed(2);

  // ---- Expenses + net profit -------------------------------------------
  const expenses = Number(expenseAgg._sum.amount ?? 0);
  const netProfit = grossProfit - expenses;
  const expenseRows = [...expensesByCategory]
    .map((e) => ({ category: e.category, amount: Number(e._sum.amount ?? 0), count: e._count._all }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Profit & Loss"
        subtitle={`Delivered orders only · ${range.label}. COGS computed via FIFO cost allocations where available, falling back to product costPrice.`}
        exportPath="/api/admin/reports/financial"
        currentRange={range.preset}
        currentFrom={range.from ? range.from.toISOString().slice(0, 10) : ""}
        currentTo={range.to ? range.to.toISOString().slice(0, 10) : ""}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={fmtMoney(revenue)}
          icon={TrendingUp}
          accent="success"
          sub={`${orderCount} delivered orders`}
        />
        <StatCard
          label="Gross profit"
          value={fmtMoney(grossProfit)}
          icon={Percent}
          accent={grossProfit >= 0 ? "success" : "primary"}
          sub={`${grossMarginPct.toFixed(1)}% margin · COGS ${fmtMoney(cogs)}`}
        />
        <StatCard
          label="Expenses"
          value={fmtMoney(expenses)}
          icon={Receipt}
          accent="warning"
          sub={`${expenseAgg._count._all} entries logged`}
        />
        <StatCard
          label="Net profit"
          value={fmtMoney(netProfit)}
          icon={netProfit >= 0 ? TrendingUp : TrendingDown}
          accent={netProfit >= 0 ? "success" : "primary"}
          sub="Revenue − COGS − Expenses"
        />
      </div>

      {/* P&L statement card — formatted like an accountant's view. */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Profit & loss statement</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              <PnLRow label="Revenue (delivered orders)" value={revenue} />
              <PnLRow label="Discounts applied" value={-discounts} muted />
              <PnLRow label="Shipping collected" value={shipping} muted />
              <PnLRow label="Cost of goods sold (FIFO)" value={-cogs} />
              <PnLRow label="Gross profit" value={grossProfit} bold />
              <PnLRow label="Operating expenses" value={-expenses} />
              <PnLRow label="Net profit" value={netProfit} bold highlight />
            </tbody>
          </table>
          {itemsMissingCost > 0 && (
            <p className="mt-3 text-xs text-amber-300">
              ⚠ {itemsMissingCost} unit{itemsMissingCost === 1 ? "" : "s"} sold this period have no cost data —
              gross profit is overstated by their unknown cost. Add costPrice to those products for accurate margin.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sales-context + VAT block */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold tracking-tight">Sales context</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Units sold</dt>
              <dd className="text-right tabular-nums">{unitsSold}</dd>
              <dt className="text-muted-foreground">Line subtotal</dt>
              <dd className="text-right tabular-nums">{fmtMoney(lineSubtotal)}</dd>
              <dt className="text-muted-foreground">Avg. order value</dt>
              <dd className="text-right tabular-nums">{orderCount > 0 ? fmtMoney(revenue / orderCount) : "—"}</dd>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold tracking-tight">VAT (20% UK standard)</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">VAT base</dt>
              <dd className="text-right tabular-nums">{fmtMoney(vatBase)}</dd>
              <dt className="text-muted-foreground">VAT collected</dt>
              <dd className="text-right tabular-nums font-medium">{fmtMoney(vatCollected)}</dd>
              <dt className="text-muted-foreground">Excludes VAT on purchases</dt>
              <dd className="text-right text-xs text-muted-foreground">Manual</dd>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-end justify-between gap-3 p-5 pb-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Expenses by category</h2>
              <p className="text-xs text-muted-foreground">{range.label}.</p>
            </div>
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Category</TableHead>
                <TableHead className="text-right">Entries</TableHead>
                <TableHead className="text-right pr-5">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseRows.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                  No expenses logged in this period.
                </TableCell></TableRow>
              ) : expenseRows.map((e) => (
                <TableRow key={e.category}>
                  <TableCell className="pl-5 font-medium capitalize">{e.category}</TableCell>
                  <TableCell className="text-right tabular-nums">{e.count}</TableCell>
                  <TableCell className="pr-5 text-right tabular-nums font-medium">{fmtMoney(e.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Single-row helper for the P&L statement table. Negative amounts render
// in brackets (accountant convention) and as a deduction.
function PnLRow({
  label, value, bold, muted, highlight,
}: {
  label: string;
  value: number;
  bold?: boolean;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <tr className={highlight ? "bg-red/[0.05]" : ""}>
      <td className={`py-2 ${bold ? "font-semibold" : muted ? "text-muted-foreground" : ""}`}>
        {label}
      </td>
      <td className={`py-2 text-right tabular-nums ${bold ? "font-semibold" : muted ? "text-muted-foreground" : ""}`}>
        {value < 0 ? `(${fmtMoney(Math.abs(value))})` : fmtMoney(value)}
      </td>
    </tr>
  );
}
