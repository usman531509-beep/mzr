import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { StatCard } from "@/components/admin/StatCard";
import { RevenueLineChart } from "@/components/admin/RevenueLineChart";
import { ReportHeader } from "@/components/admin/reports/ReportHeader";
import { resolveRange } from "@/lib/reports/date-range";
import { requireReportAccess } from "@/lib/reports/auth";
import { ShoppingCart, TrendingUp, Users as UsersIcon, Tag } from "lucide-react";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

// Sales report — answers the four most common admin questions in one
// page: "how much did we sell", "what's selling", "who's buying", and
// "what's the daily trend". All scoped to the date range. Trade vs.
// retail split is surfaced as a KPI so the impact of trade discounts is
// always visible alongside top-line revenue.
export default async function SalesReport({ searchParams }: { searchParams: SP }) {
  const session = await requireReportAccess("reports.view");
  if (!session) redirect("/admin");

  const sp = await searchParams;
  const range = resolveRange(sp);
  const where = range.from && range.to
    ? { createdAt: { gte: range.from, lte: range.to }, status: "DELIVERED" as const }
    : { status: "DELIVERED" as const };

  // One Promise.all batch — keeps the page render under a single
  // server-side round-trip per table touched.
  // Single Order findMany — the same row set powers the daily chart,
  // the retail-vs-trade split, and the top-customer aggregation. The
  // aggregate stays separate because Prisma can do those _sum / _count
  // numbers entirely in Postgres without pulling rows back.
  const [orderAgg, orders, items, traderUsers] = await Promise.all([
    prisma.order.aggregate({
      where,
      _sum: { total: true, shippingFee: true, discount: true },
      _count: { _all: true },
    }),
    prisma.order.findMany({
      where,
      select: {
        id: true, orderNumber: true, total: true, createdAt: true,
        userId: true, customerName: true, customerEmail: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.orderItem.findMany({
      where: range.from && range.to
        ? { order: { is: { createdAt: { gte: range.from, lte: range.to }, status: "DELIVERED" } } }
        : { order: { is: { status: "DELIVERED" } } },
      select: {
        productId: true, name: true, quantity: true,
        price: true, originalPrice: true,
      },
    }),
    // Users with tradeApproved who ordered in range — for retail vs. trade
    // split. Looked up separately because the order row doesn't snapshot
    // the trade-flag.
    prisma.user.findMany({
      where: { tradeApproved: true },
      select: { id: true },
    }),
  ]);

  // ---- Headline KPIs ----------------------------------------------------
  const revenue = Number(orderAgg._sum.total ?? 0);
  const orderCount = orderAgg._count._all;
  const discountTotal = Number(orderAgg._sum.discount ?? 0);
  const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;

  const traderUserIds = new Set(traderUsers.map((u) => u.id));
  let tradeRevenue = 0;
  let retailRevenue = 0;
  for (const o of orders) {
    const v = Number(o.total);
    if (o.userId && traderUserIds.has(o.userId)) tradeRevenue += v;
    else retailRevenue += v;
  }

  // ---- Daily chart series ----------------------------------------------
  const days: { date: string; key: string; revenue: number; orders: number }[] = [];
  if (range.from && range.to) {
    const span = range.days ?? 30;
    for (let i = 0; i < span; i++) {
      const d = new Date(range.from);
      d.setDate(range.from.getDate() + i);
      if (d > range.to) break;
      const key = d.toISOString().slice(0, 10);
      days.push({
        key,
        date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        revenue: 0, orders: 0,
      });
    }
    const idx = new Map(days.map((d, i) => [d.key, i]));
    for (const o of orders) {
      const k = o.createdAt.toISOString().slice(0, 10);
      const i = idx.get(k);
      if (i === undefined) continue;
      days[i].revenue += Number(o.total);
      days[i].orders += 1;
    }
  }

  // ---- Top products by revenue -----------------------------------------
  const productAgg = new Map<string, { name: string; qty: number; revenue: number }>();
  let unitsSold = 0;
  for (const it of items) {
    unitsSold += it.quantity;
    const cur = productAgg.get(it.productId);
    const line = Number(it.price) * it.quantity;
    if (cur) { cur.qty += it.quantity; cur.revenue += line; }
    else productAgg.set(it.productId, { name: it.name, qty: it.quantity, revenue: line });
  }
  const topProducts = [...productAgg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 15);

  // ---- Top customers by revenue ----------------------------------------
  const customerAgg = new Map<string, { name: string; email: string; orders: number; revenue: number }>();
  for (const o of orders) {
    const key = o.userId ?? `guest:${o.customerEmail}`;
    const cur = customerAgg.get(key);
    if (cur) { cur.orders += 1; cur.revenue += Number(o.total); }
    else customerAgg.set(key, {
      name: o.customerName, email: o.customerEmail,
      orders: 1, revenue: Number(o.total),
    });
  }
  const topCustomers = [...customerAgg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 15);

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Sales report"
        subtitle={`Delivered orders only · ${range.label}. Excludes pending and cancelled.`}
        exportPath="/api/admin/reports/sales"
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
          sub={`${orderCount} order${orderCount === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Avg. order value"
          value={fmtMoney(avgOrderValue)}
          icon={ShoppingCart}
          sub={`${unitsSold} unit${unitsSold === 1 ? "" : "s"} sold`}
        />
        <StatCard
          label="Trade revenue"
          value={fmtMoney(tradeRevenue)}
          icon={UsersIcon}
          accent="primary"
          sub={revenue > 0 ? `${Math.round((tradeRevenue / revenue) * 100)}% of total` : "—"}
        />
        <StatCard
          label="Discounts applied"
          value={fmtMoney(discountTotal)}
          icon={Tag}
          accent={discountTotal > 0 ? "warning" : undefined}
          sub="Order-level discounts"
        />
      </div>

      {days.length > 0 && (
        <div className="panel !mb-0">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h3 className="!mb-0">Revenue by day</h3>
              <p className="text-xs text-muted-foreground">Delivered orders only.</p>
            </div>
            <span className="st muted">{range.label}</span>
          </div>
          <RevenueLineChart data={days.map((d) => ({ date: d.date, revenue: d.revenue, orders: d.orders }))} />
        </div>
      )}

      <div className="panel !mb-0">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="!mb-0">Top 15 products by revenue</h3>
            <p className="text-xs text-muted-foreground">Higher rank = bigger contribution this period.</p>
          </div>
        </div>
        <table className="t">
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th className="text-right">Units</th>
              <th className="text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                No sales in this period.
              </td></tr>
            ) : topProducts.map((p, i) => (
              <tr key={p.name + i}>
                <td className="font-mono text-xs text-muted-foreground">{i + 1}</td>
                <td className="font-medium">{p.name}</td>
                <td className="text-right tabular-nums">{p.qty}</td>
                <td className="text-right font-medium tabular-nums">{fmtMoney(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel !mb-0">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="!mb-0">Top 15 customers by revenue</h3>
            <p className="text-xs text-muted-foreground">Includes guest checkouts grouped by email.</p>
          </div>
        </div>
        <table className="t">
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th className="text-right">Orders</th>
              <th className="text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {topCustomers.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                No customers in this period.
              </td></tr>
            ) : topCustomers.map((c, i) => (
              <tr key={c.email + i}>
                <td className="font-mono text-xs text-muted-foreground">{i + 1}</td>
                <td>
                  <div className="font-medium">{c.name || "(no name)"}</div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                </td>
                <td className="text-right tabular-nums">{c.orders}</td>
                <td className="text-right font-medium tabular-nums">{fmtMoney(c.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Retail vs trade footer card — answers a question accountants
          ask but isn't worth a chart on its own. */}
      <div className="panel !mb-0 grid gap-4 sm:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Retail revenue</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{fmtMoney(retailRevenue)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Trade revenue</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{fmtMoney(tradeRevenue)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total delivered</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{fmtMoney(revenue)}</div>
        </div>
      </div>
    </div>
  );
}
