import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { ExpensesClient } from "@/components/admin/ExpensesClient";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

function resolveRange(sp: Record<string, string | string[] | undefined>) {
  const range = typeof sp.range === "string" ? sp.range : "month";
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === "custom") {
    const from = typeof sp.from === "string" ? new Date(sp.from) : null;
    const to   = typeof sp.to   === "string" ? new Date(sp.to)   : null;
    if (from && to && !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      from.setHours(0, 0, 0, 0); to.setHours(23, 59, 59, 999);
      return { from, to, label: `${from.toLocaleDateString()} – ${to.toLocaleDateString()}` };
    }
  }
  if (range === "today") return { from: start, to: now, label: "Today" };
  if (range === "week")  { const f = new Date(start); f.setDate(start.getDate() - 6); return { from: f, to: now, label: "Last 7 days" }; }
  if (range === "90d")   { const f = new Date(start); f.setDate(start.getDate() - 89); return { from: f, to: now, label: "Last 90 days" }; }
  if (range === "all")   return { from: null as Date | null, to: null as Date | null, label: "All time" };
  const f = new Date(start); f.setDate(start.getDate() - 29);
  return { from: f, to: now, label: "Last 30 days" };
}

export default async function ExpensesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { from, to, label: rangeLabel } = resolveRange(sp);
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const category = typeof sp.category === "string" ? sp.category : "";

  const where: Prisma.ExpenseWhereInput = {};
  if (from && to) where.paidOn = { gte: from, lte: to };
  if (q) {
    where.OR = [
      { title:    { contains: q, mode: "insensitive" } },
      { vendor:   { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
      { notes:    { contains: q, mode: "insensitive" } },
    ];
  }
  if (category) where.category = category;

  const [expenses, totalAgg, categoryRows] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }],
      include: { createdByAdmin: { select: { name: true, email: true } } },
    }),
    prisma.expense.aggregate({ where, _sum: { amount: true }, _count: { _all: true } }),
    prisma.expense.findMany({
      distinct: ["category"],
      orderBy: { category: "asc" },
      select: { category: true },
    }),
  ]);

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
        <p className="text-sm text-muted-foreground">
          Track operational costs · {rangeLabel}.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 lg:p-5">
          <ExpensesClient
            expenses={expenses.map((e) => ({
              id: e.id,
              title: e.title,
              category: e.category,
              amount: Number(e.amount),
              paidOn: e.paidOn.toISOString(),
              vendor: e.vendor,
              paymentMethod: e.paymentMethod,
              notes: e.notes,
              createdBy: e.createdByAdmin
                ? (e.createdByAdmin.name ?? e.createdByAdmin.email)
                : null,
            }))}
            totalAmount={Number(totalAgg._sum.amount ?? 0)}
            totalCount={totalAgg._count._all}
            allCategories={categoryRows.map((c) => c.category)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
