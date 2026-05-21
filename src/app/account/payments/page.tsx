import Link from "next/link";
import {
  CheckCircle2, Clock4, CreditCard, ExternalLink, Receipt, RotateCcw, XCircle,
} from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  SUCCEEDED: { label: "Paid",      icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  PENDING:   { label: "Pending",   icon: Clock4,       className: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  FAILED:    { label: "Failed",    icon: XCircle,      className: "bg-rose-500/15 text-rose-300 ring-rose-500/30" },
  CANCELED:  { label: "Canceled",  icon: XCircle,      className: "bg-muted text-muted-foreground ring-border" },
  REFUNDED:  { label: "Refunded",  icon: RotateCcw,    className: "bg-blue-500/15 text-blue-300 ring-blue-500/30" },
};

export default async function MyPaymentsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Match payments either by userId (signed-in customer) OR by an order
  // whose customerEmail equals theirs — covers guest checkouts they
  // completed before signing in.
  const payments = await prisma.payment.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { order: { customerEmail: session.user.email ?? "" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      order: {
        select: {
          id: true, orderNumber: true, status: true,
          total: true, createdAt: true,
        },
      },
    },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">My payments</h1>
        <p className="text-sm text-muted-foreground">
          {payments.length} payment{payments.length === 1 ? "" : "s"} on record.
        </p>
      </header>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 p-16 text-center text-sm text-muted-foreground">
            <CreditCard className="h-8 w-8" />
            <p>You haven&apos;t made any card payments yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => {
            const meta = STATUS_META[p.status] ?? STATUS_META.PENDING;
            const Icon = meta.icon;
            const ref = p.order.orderNumber ?? `#${p.order.id.slice(0, 8)}…`;
            return (
              <Card key={p.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {p.providerPaymentId}
                        </div>
                        <Badge className={`gap-1 ring-1 ring-inset ${meta.className} hover:${meta.className}`}>
                          <Icon className="h-3 w-3" /> {meta.label}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm">
                        Order <Link href="/account/orders" className="font-mono text-foreground hover:underline">{ref}</Link>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(p.createdAt).toLocaleString("en-GB")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold tabular-nums">{fmtMoney(Number(p.amount))}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {p.currency}
                      </div>
                    </div>
                  </div>

                  {p.failureMessage && (
                    <>
                      <Separator className="my-3" />
                      <div className="text-xs text-rose-400/90">{p.failureMessage}</div>
                    </>
                  )}

                  {p.receiptUrl && (
                    <>
                      <Separator className="my-3" />
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Receipt className="h-3.5 w-3.5" /> View Stripe receipt
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
