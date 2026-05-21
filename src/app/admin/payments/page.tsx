import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/admin/StatCard";
import { PaymentsClient } from "@/components/admin/PaymentsClient";
import { CheckCircle2, CreditCard, Clock4, XCircle } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function PaymentsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";

  const where: Prisma.PaymentWhereInput = {};
  if (q) {
    where.OR = [
      { providerPaymentId: { contains: q, mode: "insensitive" } },
      { order: { orderNumber: { contains: q, mode: "insensitive" } } },
      { order: { customerEmail: { contains: q, mode: "insensitive" } } },
      { order: { customerName: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (status && status !== "all") {
    where.status = status as
      | "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELED" | "REFUNDED";
  }

  const [payments, totals] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        order: {
          select: {
            id: true, orderNumber: true, customerName: true,
            customerEmail: true, total: true, status: true,
          },
        },
        user: { select: { email: true, name: true } },
      },
    }),
    prisma.payment.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  // Headline counts/amounts per status — shown as KPI cards above the table.
  const byStatus = Object.fromEntries(
    totals.map((t) => [t.status, { count: t._count._all, sum: Number(t._sum.amount ?? 0) }]),
  ) as Record<string, { count: number; sum: number }>;

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Card transactions processed by Stripe across every customer order.
          Click a row to see the order and Stripe receipt.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Captured"
          value={fmtMoney(byStatus.SUCCEEDED?.sum ?? 0)}
          icon={CheckCircle2}
          accent="success"
          sub={`${byStatus.SUCCEEDED?.count ?? 0} successful payment${(byStatus.SUCCEEDED?.count ?? 0) === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Pending"
          value={byStatus.PENDING?.count ?? 0}
          icon={Clock4}
          accent={(byStatus.PENDING?.count ?? 0) > 0 ? "warning" : undefined}
          sub={`${fmtMoney(byStatus.PENDING?.sum ?? 0)} awaiting`}
        />
        <StatCard
          label="Failed / canceled"
          value={(byStatus.FAILED?.count ?? 0) + (byStatus.CANCELED?.count ?? 0)}
          icon={XCircle}
          accent={(byStatus.FAILED?.count ?? 0) > 0 ? "primary" : undefined}
          sub={`${byStatus.FAILED?.count ?? 0} failed · ${byStatus.CANCELED?.count ?? 0} canceled`}
        />
        <StatCard
          label="Refunded"
          value={fmtMoney(byStatus.REFUNDED?.sum ?? 0)}
          icon={CreditCard}
          sub={`${byStatus.REFUNDED?.count ?? 0} payment${(byStatus.REFUNDED?.count ?? 0) === 1 ? "" : "s"}`}
        />
      </div>

      <Card>
        <CardContent className="p-4 lg:p-5">
          <PaymentsClient
            rows={payments.map((p) => ({
              id: p.id,
              providerPaymentId: p.providerPaymentId,
              provider: p.provider,
              status: p.status,
              amount: Number(p.amount),
              currency: p.currency,
              receiptUrl: p.receiptUrl,
              failureMessage: p.failureMessage,
              createdAt: p.createdAt.toISOString(),
              order: {
                id: p.order.id,
                orderNumber: p.order.orderNumber,
                customerName: p.order.customerName,
                customerEmail: p.order.customerEmail,
                total: Number(p.order.total),
                status: p.order.status,
              },
              user: p.user
                ? { name: p.user.name ?? null, email: p.user.email }
                : null,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
