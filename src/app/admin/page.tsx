import Link from "next/link";
import { Package, ShoppingCart, Users, DollarSign, BadgePercent, Receipt, TrendingUp, Percent } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { ukHourNow, greetingFor, firstNameOf } from "@/lib/greeting";
import { StatCard } from "@/components/admin/StatCard";
import { DashboardClient, type DashboardCategory } from "@/components/admin/DashboardClient";
import { KpiCard } from "@/components/admin/KpiCard";
import { SalesTrendCard } from "@/components/admin/SalesTrendCard";
import { CategoryDonut } from "@/components/admin/CategoryDonut";
import { TopProductsList } from "@/components/admin/TopProductsList";
import { RecentOrdersTable } from "@/components/admin/RecentOrdersTable";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { Card, CardContent } from "@/components/ui/card";

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
  // auth() is React-cached within a request, so this is a no-op when the
  // admin layout has already resolved the same session.
  const session = await auth();
  const firstName = firstNameOf(session?.user?.name);
  const greeting = greetingFor(ukHourNow());

  const orderRangeFilter   = from && to ? { createdAt: { gte: from, lte: to } } : {};
  const itemRangeFilter    = from && to ? { order: { is: { createdAt: { gte: from, lte: to } } } } : {};
  const expenseRangeFilter = from && to ? { paidOn: { gte: from, lte: to } } : {};

  // Fixed trailing 14-day window powering the KPI sparklines + "this week"
  // deltas — independent of the selected range so the cards always show a
  // consistent recent trend (last 7 days vs the 7 before).
  const kpiStart = new Date();
  kpiStart.setHours(0, 0, 0, 0);
  kpiStart.setDate(kpiStart.getDate() - 13);

  // All dashboard queries fire in parallel as a single batch — the second
  // group used to wait for the first to finish, costing one extra DB
  // round-trip (~70ms when the DB is in another region).
  const [
    productsCount, ordersCount, usersCount, revenueAgg,
    recentOrders, products, brands, productBrands, categories, models,
    ordersForChart, orderItemsAgg,
    expensesAgg, oosCount, stockProducts, pendingAgg,
    lifetimeRevenueAgg, lifetimeOrdersCount,
    kpiOrders, kpiProducts, kpiUsers,
  ] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null } }),
    // Financial metrics only count orders that have actually been delivered.
    prisma.order.count({ where: { ...orderRangeFilter, status: "DELIVERED" } }),
    prisma.user.count({ where: { role: "USER" } }),
    prisma.order.aggregate({
      _sum: { total: true, shippingFee: true, discount: true },
      where: { ...orderRangeFilter, status: "DELIVERED" },
    }),
    // Recent orders panel still shows every order (regardless of status) so
    // admins can take action on pending / paid / shipped ones. Pull the first
    // line item + its product image for the reference-style table row.
    prisma.order.findMany({
      where: orderRangeFilter,
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { items: { take: 1, include: { product: { select: { images: true } } } } },
    }),
    // Dashboard preview only — the full catalogue lives on /admin/products
    // with its own pagination + search. Cap at 10 newest with the relations
    // the card UI needs, nothing more.
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        brand: true,
        brands: { select: { id: true } },
        category: true,
        savedCategory: { select: { id: true, name: true } },
        compatibilities: true,
      },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.productBrand.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ depth: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true, name: true, slug: true, parentId: true, path: true, depth: true,
        _count: {
          select: {
            children: { where: { deletedAt: null } },
            // Roll up active-product counts here so the dashboard doesn't
            // need to load every product just to compute category totals.
            products: { where: { active: true, deletedAt: null } },
          },
        },
      },
    }),
    prisma.bikeModel.findMany({
      orderBy: [{ brandId: "asc" }, { name: "asc" }],
      include: { brand: true },
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
        product: { select: { categoryId: true, costPrice: true, images: true, slug: true } },
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
    prisma.product.count({ where: { active: true, stock: 0, deletedAt: null } }),
    // All active products with stock — used for current low-stock count and
    // to value the inventory at retail.
    prisma.product.findMany({
      where: { active: true, deletedAt: null },
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
    // Trailing 14-day series for the KPI sparklines + week-over-week deltas.
    prisma.order.findMany({
      where: { status: "DELIVERED", createdAt: { gte: kpiStart } },
      select: { createdAt: true, total: true },
    }),
    prisma.product.findMany({
      where: { deletedAt: null, createdAt: { gte: kpiStart } },
      select: { createdAt: true },
    }),
    prisma.user.findMany({
      where: { role: "USER", createdAt: { gte: kpiStart } },
      select: { createdAt: true },
    }),
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
  // VAT is 20% on goods + shipping (matches checkout).
  const VAT_RATE = 0.20;
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
  const shippingCollected = Number(revenueAgg._sum.shippingFee ?? 0);
  const discountsTotal = Number(revenueAgg._sum.discount ?? 0);
  // VAT base mirrors checkout: subtotal + shipping − discount, clamped at 0.
  const vatBase = Math.max(0, lineSubtotal + shippingCollected - discountsTotal);
  const taxCollected = +(vatBase * VAT_RATE).toFixed(2);

  // ---------- Chart data --------------------------------------------------

  // Sales-trend series. Bounded ranges (today/week/month/90d/custom) bucket
  // daily. "All time" spans from the first delivered order to today and steps
  // up to weekly / monthly buckets as the span grows, so the line always
  // covers the actual sales history instead of an empty rolling window.
  const trendTo = to ?? new Date();
  let trendFrom: Date;
  if (from) {
    trendFrom = new Date(from);
  } else {
    // ordersForChart is delivered-only, ordered ascending → [0] is the oldest.
    const firstDelivered = ordersForChart[0]?.createdAt;
    trendFrom = firstDelivered ? new Date(firstDelivered) : new Date(trendTo);
    if (!firstDelivered) trendFrom.setDate(trendFrom.getDate() - 29);
  }
  trendFrom.setHours(0, 0, 0, 0);

  const spanDays = Math.max(1, Math.ceil((trendTo.getTime() - trendFrom.getTime()) / 86400000) + 1);
  const unit: "day" | "week" | "month" =
    spanDays <= 92 ? "day" : spanDays <= 730 ? "week" : "month";

  // Canonical bucket key + axis label for a date, at the chosen granularity.
  const bucketOf = (d: Date): { key: string; label: string } => {
    if (unit === "month") {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { key, label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }) };
    }
    if (unit === "week") {
      const w = new Date(d);
      w.setDate(w.getDate() - ((w.getDay() + 6) % 7)); // back to Monday
      w.setHours(0, 0, 0, 0);
      return { key: w.toISOString().slice(0, 10), label: w.toLocaleDateString(undefined, { month: "short", day: "numeric" }) };
    }
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) };
  };

  // Pre-seed empty buckets across the whole span so the x-axis is continuous.
  const days: { date: string; key: string; revenue: number; orders: number }[] = [];
  const dayIndex = new Map<string, number>();
  {
    const cursor = new Date(trendFrom);
    let guard = 0;
    while (cursor <= trendTo && guard < 5000) {
      const { key, label } = bucketOf(cursor);
      if (!dayIndex.has(key)) {
        dayIndex.set(key, days.length);
        days.push({ date: label, key, revenue: 0, orders: 0 });
      }
      if (unit === "day") cursor.setDate(cursor.getDate() + 1);
      else if (unit === "week") cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1);
      guard++;
    }
  }
  for (const o of ordersForChart) {
    if (o.status !== "DELIVERED") continue;
    const idx = dayIndex.get(bucketOf(o.createdAt).key);
    if (idx === undefined) continue;
    days[idx].revenue += Number(o.total);
    days[idx].orders += 1;
  }

  // KPI sparklines + week-over-week deltas. Bucket the trailing 14 days, then
  // compare the most recent 7 days against the 7 before them.
  const KPI_DAYS = 14;
  const kpiKeys: string[] = [];
  for (let i = 0; i < KPI_DAYS; i++) {
    const d = new Date(kpiStart);
    d.setDate(kpiStart.getDate() + i);
    kpiKeys.push(d.toISOString().slice(0, 10));
  }
  const kpiIdx = new Map(kpiKeys.map((k, i) => [k, i]));
  const revSeries = new Array<number>(KPI_DAYS).fill(0);
  const ordSeries = new Array<number>(KPI_DAYS).fill(0);
  const prodSeries = new Array<number>(KPI_DAYS).fill(0);
  const userSeries = new Array<number>(KPI_DAYS).fill(0);
  for (const o of kpiOrders) {
    const idx = kpiIdx.get(o.createdAt.toISOString().slice(0, 10));
    if (idx === undefined) continue;
    revSeries[idx] += Number(o.total);
    ordSeries[idx] += 1;
  }
  for (const p of kpiProducts) {
    const idx = kpiIdx.get(p.createdAt.toISOString().slice(0, 10));
    if (idx !== undefined) prodSeries[idx] += 1;
  }
  for (const u of kpiUsers) {
    const idx = kpiIdx.get(u.createdAt.toISOString().slice(0, 10));
    if (idx !== undefined) userSeries[idx] += 1;
  }
  const wow = (series: number[]): number | null => {
    const prev = series.slice(0, 7).reduce((a, b) => a + b, 0);
    const last = series.slice(7).reduce((a, b) => a + b, 0);
    if (prev === 0) return last > 0 ? 100 : null;
    return ((last - prev) / prev) * 100;
  };
  const revenueDelta = wow(revSeries);
  const ordersDelta = wow(ordSeries);
  const productsDelta = wow(prodSeries);
  const customersDelta = wow(userSeries);

  // Revenue per category from non-cancelled orders. Top 10.
  const catRevenue = new Map<string, number>();
  const productRevenue = new Map<string, { name: string; quantity: number; revenue: number; image: string | null; slug: string | null }>();
  let traderDiscount = 0;
  let traderDiscountedItems = 0;
  for (const it of orderItemsAgg) {
    if (it.order.status !== "DELIVERED") continue;
    const line = Number(it.price) * it.quantity;
    // Orphaned products (categoryId null) bucket under "Uncategorised" in
    // the revenue chart — small enough to surface on its own slice when the
    // admin needs to spot uncategorised sales.
    const catKey = it.product.categoryId ?? "__uncategorised";
    catRevenue.set(catKey, (catRevenue.get(catKey) ?? 0) + line);
    const cur = productRevenue.get(it.productId);
    if (cur) {
      cur.quantity += it.quantity;
      cur.revenue += line;
    } else {
      productRevenue.set(it.productId, {
        name: it.name, quantity: it.quantity, revenue: line,
        image: it.product.images[0] ?? null, slug: it.product.slug,
      });
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
    .map(([id, revenue]) => ({
      name: id === "__uncategorised"
        ? "Uncategorised"
        : (categoryNameById.get(id) ?? "Unknown"),
      revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  const topProducts = Array.from(productRevenue.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Recent-orders table rows: first line item + its image, formatted date.
  const recentOrderRows = recentOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    product: o.items[0]?.name ?? "Order",
    image: o.items[0]?.product.images[0] ?? null,
    date: o.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    status: o.status,
    total: Number(o.total),
    customer: o.customerName,
  }));

  // Category counts come straight from Postgres via _count above; the
  // "recent parts in this category" inline lists from the old dashboard
  // were dropped to keep the overview lightweight.
  const categoriesData = categories
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      productCount: c._count.products,
      recent: [] as DashboardCategory["recent"],
    }))
    .sort((a, b) => b.productCount - a.productCount);

  const productsForClient = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price.toString(),
    costPrice: p.costPrice ? p.costPrice.toString() : null,
    stock: p.stock,
    brand: p.brand.name,
    category: p.category?.name ?? null,
    categorySlug: p.category?.slug ?? null,
    featured: p.featured,
    demanding: p.demanding,
    active: p.active,
    image: p.images[0] ?? null,
    description: p.description,
    brandId: p.brandId,
    brandIds: p.brands.map((b) => b.id),
    productBrandId: p.productBrandId,
    categoryId: p.categoryId,
    savedCategoryId: p.savedCategoryId,
    savedCategoryName: p.savedCategory?.name ?? null,
    sku: p.sku,
    oemNumber: p.oemNumber,
    images: p.images,
    compatibilities: p.compatibilities.map((c) => ({
      bikeModelId: c.bikeModelId, yearFrom: c.yearFrom, yearTo: c.yearTo,
    })),
  }));

  return (
    <div className="space-y-6">
      {/* Page hero — the breadcrumb in the top bar already carries the
          Admin › Dashboard context, so the title leads straight with a greeting. */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {greeting}, <span className="text-red">{firstName}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's your store overview · {rangeLabel}.</p>
      </header>

      <DateRangeFilter />

      {(oosCount > 0 || lowStockCount > 0) && (
        <Card className="rounded-[10px] border-[#f0d99a] bg-[#fff8e6] shadow-none">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#fff4d6] text-gold">
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
            <Link href="/admin/stock" className="text-xs font-semibold text-gold hover:underline">
              Open stock →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ---- Hero KPIs ------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          filled id="rev"
          label="Total Revenue"
          value={fmtMoney(totalRevenue)}
          delta={revenueDelta}
          data={revSeries}
          icon={DollarSign}
          href="/admin/reports/financial"
        />
        <KpiCard
          id="ord"
          label="Total Orders"
          value={ordersCount.toLocaleString()}
          delta={ordersDelta}
          data={ordSeries}
          icon={ShoppingCart}
          href="/admin/orders"
        />
        <KpiCard
          id="prod"
          label="Total Products"
          value={productsCount.toLocaleString()}
          delta={productsDelta}
          data={prodSeries}
          icon={Package}
          href="/admin/products"
        />
        <KpiCard
          id="cust"
          label="Active Customers"
          value={usersCount.toLocaleString()}
          delta={customersDelta}
          data={userSeries}
          icon={Users}
          href="/admin/customers"
        />
      </div>

      {/* ---- Sales trend + category donut ----------------------------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesTrendCard
            data={days.map((d) => ({ date: d.date, revenue: d.revenue, orders: d.orders }))}
            total={totalRevenue}
            delta={revenueDelta}
            rangeLabel={rangeLabel}
          />
        </div>
        <CategoryDonut data={categoryRevenueData} />
      </div>

      {/* ---- Top products + recent orders ----------------------------- */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <TopProductsList rows={topProducts} />
        </div>
        <div className="lg:col-span-3">
          <RecentOrdersTable rows={recentOrderRows} />
        </div>
      </div>

      {/* ---- Operations (current state, range-agnostic) --------------- */}
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

      {/* ---- Financial (range-scoped) --------------------------------- */}
      <SectionHeader title="Financial" subtitle={rangeLabel} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          label="VAT collected"
          value={fmtMoney(taxCollected)}
          icon={Percent}
          sub={`20% · ${unitsSold} unit${unitsSold === 1 ? "" : "s"} sold`}
        />
        <StatCard
          label="Trader discount"
          value={fmtMoney(traderDiscount)}
          icon={BadgePercent}
          sub={traderDiscountedItems > 0 ? `${traderDiscountedItems} discounted item${traderDiscountedItems === 1 ? "" : "s"}` : "No discounts applied"}
        />
      </div>

      {/* Categories + parts */}
      <DashboardClient
        categoriesData={categoriesData}
        products={productsForClient}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        productBrands={productBrands.map((b) => ({ id: b.id, name: b.name }))}
        categories={categories.map((c) => ({
          id: c.id, name: c.name, slug: c.slug,
          parentId: c.parentId, path: c.path, childCount: c._count.children,
        }))}
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
    <div className="flex items-baseline justify-between border-b border-line pb-1 pt-2">
      <h2 className="text-sm font-bold uppercase tracking-wider text-ink/70">
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

