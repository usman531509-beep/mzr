import Link from "next/link";
import { Package, ShoppingCart, Users, DollarSign, BadgePercent, Receipt, TrendingUp, Percent } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { StatCard } from "@/components/admin/StatCard";
import { DashboardClient } from "@/components/admin/DashboardClient";
import { RevenueLineChart } from "@/components/admin/RevenueLineChart";
import { StatusPieChart } from "@/components/admin/StatusPieChart";
import { CategoryBarChart } from "@/components/admin/CategoryBarChart";
import { TopProductsList } from "@/components/admin/TopProductsList";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableHead, TableRow, TableBody, TableCell,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

function resolveRange(sp: Record<string, string | string[] | undefined>) {
  // Dashboard defaults to the last 30 days for a monthly snapshot. Other
  // ranges are opt-in via the DateRangeFilter at the top.
  const range = typeof sp.range === "string" ? sp.range : "month";
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (range === "custom") {
    const from = typeof sp.from === "string" ? new Date(sp.from) : null;
    const to   = typeof sp.to   === "string" ? new Date(sp.to)   : null;
    if (from && to && !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      return { from, to, label: `${from.toLocaleDateString()} – ${to.toLocaleDateString()}`, days: Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000)) };
    }
  }
  if (range === "today") {
    return { from: start, to: now, label: "Today", days: 1 };
  }
  if (range === "week") {
    const from = new Date(start);
    from.setDate(start.getDate() - 6);
    return { from, to: now, label: "Last 7 days", days: 7 };
  }
  if (range === "90d") {
    const from = new Date(start);
    from.setDate(start.getDate() - 89);
    return { from, to: now, label: "Last 90 days", days: 90 };
  }
  if (range === "all") {
    return { from: null, to: null, label: "All time", days: null };
  }
  // default: month (last 30 days)
  const from = new Date(start);
  from.setDate(start.getDate() - 29);
  return { from, to: now, label: "Last 30 days", days: 30 };
}

export default async function AdminDashboard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { from, to, label: rangeLabel, days: rangeDays } = resolveRange(sp);

  const orderRangeFilter   = from && to ? { createdAt: { gte: from, lte: to } } : {};
  const itemRangeFilter    = from && to ? { order: { is: { createdAt: { gte: from, lte: to } } } } : {};
  const expenseRangeFilter = from && to ? { paidOn: { gte: from, lte: to } } : {};

  // All dashboard queries fire in parallel as a single batch — the second
  // group used to wait for the first to finish, costing one extra DB
  // round-trip (~70ms when the DB is in another region).
  const [
    productsCount, ordersCount, usersCount, revenueAgg,
    recentOrders, products, brands, categories, models,
    statusCounts, ordersForChart, orderItemsAgg,
    expensesAgg, oosCount, stockProducts, pendingAgg,
    lifetimeRevenueAgg, lifetimeOrdersCount,
  ] = await Promise.all([
    prisma.product.count(),
    // Financial metrics only count orders that have actually been delivered.
    prisma.order.count({ where: { ...orderRangeFilter, status: "DELIVERED" } }),
    prisma.user.count({ where: { role: "USER" } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { ...orderRangeFilter, status: "DELIVERED" },
    }),
    // Recent orders panel still shows every order (regardless of status) so
    // admins can take action on pending / paid / shipped ones.
    prisma.order.findMany({ where: orderRangeFilter, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { brand: true, category: true, compatibilities: true },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.bikeModel.findMany({
      orderBy: [{ brandId: "asc" }, { name: "asc" }],
      include: { brand: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: orderRangeFilter,
    }),
    prisma.order.findMany({
      where: { ...orderRangeFilter, status: "DELIVERED" },
      select: { createdAt: true, total: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.orderItem.findMany({
      where: itemRangeFilter,
      include: {
        order: { select: { status: true, createdAt: true } },
        product: { select: { categoryId: true, costPrice: true } },
        // FIFO cost attribution: when populated, each row's qty × unitCost is
        // the real cost of goods sold (instead of the single mutable
        // Product.costPrice which doesn't reflect batch history).
        costAllocations: { select: { qty: true, unitCost: true } },
      },
    }),
    prisma.expense.aggregate({
      where: expenseRangeFilter,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.product.count({ where: { active: true, stock: 0 } }),
    // All active products with stock — used for current low-stock count and
    // to value the inventory at retail.
    prisma.product.findMany({
      where: { active: true },
      select: { id: true, name: true, stock: true, lowStockThreshold: true, price: true },
    }),
    // Pending orders are NOT range-scoped — admins always need to see all
    // currently-awaiting orders regardless of which date filter is active.
    prisma.order.aggregate({
      where: { status: "PENDING" },
      _sum: { total: true },
      _count: { _all: true },
    }),
    // Lifetime context (range-agnostic).
    prisma.order.aggregate({
      where: { status: "DELIVERED" },
      _sum: { total: true },
    }),
    prisma.order.count({ where: { status: "DELIVERED" } }),
  ]);
  const lowStockRows = stockProducts.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold);
  const lowStockCount = lowStockRows.length;
  const inventoryValue = stockProducts.reduce(
    (s, p) => s + Number(p.price) * p.stock,
    0,
  );
  const lifetimeRevenue = Number(lifetimeRevenueAgg._sum.total ?? 0);
  const pendingCount = pendingAgg._count._all;
  const pendingTotal = Number(pendingAgg._sum.total ?? 0);
  const totalExpenses = Number(expensesAgg._sum.amount ?? 0);
  const totalRevenue  = Number(revenueAgg._sum.total ?? 0);

  // Gross profit = revenue − cost of goods sold.
  // Preferred cost source: per-item FIFO cost allocations (one row per
  // StockLayer the item consumed). Fallback for items without any
  // allocations yet (legacy data before FIFO was wired in, or items still
  // pending): the product's current costPrice.
  // Items with no costPrice and no allocations are surfaced as "missing cost".
  const TAX_RATE = 0.05;
  let grossProfit = 0;
  let itemsMissingCost = 0;
  let lineSubtotal = 0;
  let unitsSold = 0;
  for (const it of orderItemsAgg) {
    if (it.order.status !== "DELIVERED") continue;
    const sellPrice = Number(it.price);
    const line = sellPrice * it.quantity;
    lineSubtotal += line;
    unitsSold += it.quantity;

    if (it.costAllocations.length > 0) {
      // FIFO path: each allocation already knows its consumed qty and the
      // batch unitCost at the time the layer was received.
      for (const a of it.costAllocations) {
        grossProfit += (sellPrice - Number(a.unitCost)) * a.qty;
      }
      continue;
    }
    if (it.product.costPrice == null) {
      itemsMissingCost += it.quantity;
      continue;
    }
    grossProfit += (sellPrice - Number(it.product.costPrice)) * it.quantity;
  }
  const taxCollected = +(lineSubtotal * TAX_RATE).toFixed(2);

  // ---------- Chart data --------------------------------------------------

  // Revenue + order count bucketed across the active range. Days with no
  // orders still appear (zero) so the line chart has a continuous x-axis.
  // For "all time" we fall back to a 30-day rolling window so the chart
  // stays readable.
  const chartFrom = from ?? (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 29);
    return d;
  })();
  const chartTo = to ?? new Date();
  const chartDays = rangeDays ?? 30;
  const days: { date: string; key: string; revenue: number; orders: number }[] = [];
  for (let i = 0; i < chartDays; i++) {
    const d = new Date(chartFrom);
    d.setDate(chartFrom.getDate() + i);
    if (d > chartTo) break;
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    days.push({ date: label, key, revenue: 0, orders: 0 });
  }
  const dayIndex = new Map(days.map((d, i) => [d.key, i]));
  for (const o of ordersForChart) {
    if (o.status !== "DELIVERED") continue;
    const key = o.createdAt.toISOString().slice(0, 10);
    const idx = dayIndex.get(key);
    if (idx === undefined) continue;
    days[idx].revenue += Number(o.total);
    days[idx].orders += 1;
  }

  // Order count per status (for the donut).
  const STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
  const statusMap = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count._all]),
  ) as Record<string, number>;
  const statusData = STATUSES.map((s) => ({ status: s, count: statusMap[s] ?? 0 }));

  // Revenue per category from non-cancelled orders. Top 10.
  const catRevenue = new Map<string, number>();
  const productRevenue = new Map<string, { name: string; quantity: number; revenue: number }>();
  let traderDiscount = 0;
  let traderDiscountedItems = 0;
  for (const it of orderItemsAgg) {
    if (it.order.status !== "DELIVERED") continue;
    const line = Number(it.price) * it.quantity;
    catRevenue.set(it.product.categoryId, (catRevenue.get(it.product.categoryId) ?? 0) + line);
    const cur = productRevenue.get(it.productId);
    if (cur) {
      cur.quantity += it.quantity;
      cur.revenue += line;
    } else {
      productRevenue.set(it.productId, { name: it.name, quantity: it.quantity, revenue: line });
    }
    const original = Number(it.originalPrice);
    const paid     = Number(it.price);
    if (original > paid) {
      traderDiscount += (original - paid) * it.quantity;
      traderDiscountedItems += it.quantity;
    }
  }
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const categoryRevenueData = Array.from(catRevenue.entries())
    .map(([id, revenue]) => ({ name: categoryNameById.get(id) ?? "Unknown", revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  const topProducts = Array.from(productRevenue.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const productsByCat = new Map<string, typeof products>();
  for (const p of products) {
    const arr = productsByCat.get(p.categoryId) ?? [];
    arr.push(p);
    productsByCat.set(p.categoryId, arr);
  }

  const categoriesData = categories.map((c) => {
    const list = productsByCat.get(c.id) ?? [];
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      productCount: list.length,
      recent: list.slice(0, 3).map((p) => ({
        id: p.id, name: p.name, price: p.price.toString(), stock: p.stock,
        image: p.images[0] ?? null,
      })),
    };
  });

  const productsForClient = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price.toString(),
    costPrice: p.costPrice ? p.costPrice.toString() : null,
    stock: p.stock,
    brand: p.brand.name,
    category: p.category.name,
    categorySlug: p.category.slug,
    featured: p.featured,
    active: p.active,
    image: p.images[0] ?? null,
    description: p.description,
    brandId: p.brandId,
    categoryId: p.categoryId,
    sku: p.sku,
    oemNumber: p.oemNumber,
    images: p.images,
    compatibilities: p.compatibilities.map((c) => ({
      bikeModelId: c.bikeModelId, yearFrom: c.yearFrom, yearTo: c.yearTo,
    })),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your store · {rangeLabel}.</p>
      </header>

      <DateRangeFilter />

      {(oosCount > 0 || lowStockCount > 0) && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-500/15 text-amber-300">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {oosCount > 0 && (
                    <>
                      {oosCount} product{oosCount === 1 ? "" : "s"} out of stock
                      {lowStockCount > 0 && " · "}
                    </>
                  )}
                  {lowStockCount > 0 && (
                    <>{lowStockCount} low on stock</>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Restock soon to avoid losing sales.
                </div>
              </div>
            </div>
            <Link href="/admin/stock" className="text-xs font-medium text-amber-300 hover:underline">
              Open stock →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ---- Performance (range-scoped) ----------------------------------- */}
      <SectionHeader title="Performance" subtitle={rangeLabel} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Revenue"
          value={fmtMoney(totalRevenue)}
          icon={DollarSign}
          accent="success"
          sub={`${ordersCount} delivered order${ordersCount === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Net profit"
          value={fmtMoney(grossProfit)}
          icon={TrendingUp}
          accent={grossProfit >= 0 ? "success" : "primary"}
          sub={
            itemsMissingCost > 0
              ? `${itemsMissingCost} item${itemsMissingCost === 1 ? "" : "s"} missing cost data`
              : "Retail − cost on sold items"
          }
        />
        <StatCard
          label="Expenses"
          value={fmtMoney(totalExpenses)}
          icon={Receipt}
          accent="warning"
          sub={`${expensesAgg._count._all} entr${expensesAgg._count._all === 1 ? "y" : "ies"} logged`}
        />
        <StatCard
          label="Tax collected"
          value={fmtMoney(taxCollected)}
          icon={Percent}
          sub={`5% · ${unitsSold} unit${unitsSold === 1 ? "" : "s"} sold`}
        />
        <StatCard
          label="Trader discount"
          value={fmtMoney(traderDiscount)}
          icon={BadgePercent}
          sub={traderDiscountedItems > 0 ? `${traderDiscountedItems} discounted item${traderDiscountedItems === 1 ? "" : "s"}` : "No discounts applied"}
        />
      </div>

      {/* ---- Operational snapshot (always current, range-agnostic) ------- */}
      <SectionHeader title="Operations" subtitle="Current state" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending orders"
          value={pendingCount}
          icon={ShoppingCart}
          accent={pendingCount > 0 ? "warning" : undefined}
          sub={pendingCount > 0 ? `${fmtMoney(pendingTotal)} awaiting` : "All clear"}
        />
        <StatCard
          label="Out of stock"
          value={oosCount}
          icon={Package}
          accent={oosCount > 0 ? "primary" : undefined}
          sub={oosCount > 0 ? "Restock now" : "All stocked"}
        />
        <StatCard
          label="Low stock"
          value={lowStockCount}
          icon={Package}
          accent={lowStockCount > 0 ? "warning" : undefined}
          sub={lowStockCount > 0 ? "Below threshold" : "Healthy"}
        />
        <StatCard
          label="Inventory value"
          value={fmtMoney(inventoryValue)}
          icon={DollarSign}
          sub="At retail · all stock"
        />
      </div>

      {/* ---- Lifetime totals (range-agnostic context) -------------------- */}
      <SectionHeader title="All-time totals" subtitle="Cumulative since launch" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Lifetime revenue"
          value={fmtMoney(lifetimeRevenue)}
          icon={DollarSign}
          accent="success"
          sub={`${lifetimeOrdersCount} delivered order${lifetimeOrdersCount === 1 ? "" : "s"}`}
        />
        <StatCard label="Customers" value={usersCount} icon={Users} sub="Registered users" />
        <StatCard label="Products" value={productsCount} icon={Package} sub="Active in catalogue" />
        <StatCard
          label="Orders this period"
          value={ordersCount}
          icon={ShoppingCart}
          accent="primary"
          sub={`${rangeLabel} · delivered`}
        />
      </div>

      <SectionHeader title="Trends" subtitle={rangeLabel} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Revenue · {rangeLabel.toLowerCase()}</CardTitle>
            <CardDescription>Daily revenue from non-cancelled orders.</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueLineChart data={days.map((d) => ({ date: d.date, revenue: d.revenue, orders: d.orders }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Orders by status</CardTitle>
            <CardDescription>{rangeLabel} distribution.</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusPieChart data={statusData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Revenue by category</CardTitle>
            <CardDescription>Top 10 categories · {rangeLabel.toLowerCase()}.</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBarChart data={categoryRevenueData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 10 selling products</CardTitle>
            <CardDescription>Best-sellers · {rangeLabel.toLowerCase()}.</CardDescription>
          </CardHeader>
          <CardContent>
            <TopProductsList rows={topProducts} />
          </CardContent>
        </Card>
      </div>

      <SectionHeader title="Recent activity" subtitle="All statuses" />
      <Card>
        <CardHeader className="flex-row items-end justify-between">
          <div>
            <CardTitle className="text-lg">Recent orders</CardTitle>
            <CardDescription>Latest 5 orders in {rangeLabel.toLowerCase()} · all statuses.</CardDescription>
          </div>
          <Link href="/admin/orders" className="text-xs font-medium text-primary hover:underline">View all →</Link>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No orders yet.</TableCell></TableRow>
                ) : recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.orderNumber ?? `${o.id.slice(0, 8)}…`}</TableCell>
                    <TableCell>{o.customerName}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-right font-medium">{fmtMoney(Number(o.total))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Categories + parts */}
      <DashboardClient
        categoriesData={categoriesData}
        products={productsForClient}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
        models={models.map((m) => ({
          id: m.id, name: m.name, brandId: m.brandId,
          yearStart: m.yearStart, yearEnd: m.yearEnd,
          brand: { name: m.brand.name },
        }))}
      />
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border pb-1 pt-2">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">
        {title}
      </h2>
      {subtitle && (
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {subtitle}
        </span>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const v =
    status === "DELIVERED" ? "success" :
    status === "PAID" || status === "SHIPPED" ? "default" :
    status === "CANCELLED" ? "destructive" : "secondary";
  return <Badge variant={v as never}>{status}</Badge>;
}
