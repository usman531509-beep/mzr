import Link from "next/link";
import { CheckCircle2, Clock4, ExternalLink, XCircle } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; payment_intent?: string; redirect_status?: string }>;
}) {
  const { id, payment_intent: piParam, redirect_status: redirectStatus } = await searchParams;

  // Stripe sometimes redirects with payment_intent + redirect_status set;
  // either id (our order id) or payment_intent gets us to the order.
  const order = id
    ? await prisma.order.findUnique({
        where: { id },
        include: {
          items: true,
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      })
    : piParam
      ? await prisma.order.findFirst({
          where: { payments: { some: { providerPaymentId: piParam } } },
          include: {
            items: true,
            payments: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        })
      : null;

  const latestPayment = order?.payments[0] ?? null;
  // Headline status. Stripe's redirect_status hints which event is en route
  // from its servers — we surface it as a "pending" affordance because the
  // webhook (the authoritative source) usually completes within a second
  // or two.
  const paid = latestPayment?.status === "SUCCEEDED" || !!order?.paidAt;
  const paymentFailed = latestPayment?.status === "FAILED" || redirectStatus === "failed";
  const paymentPending = !paid && !paymentFailed && latestPayment?.status === "PENDING";

  const ref = order?.orderNumber ?? (order ? `#${order.id.slice(0, 8)}…` : "");

  return (
    <div className="container" style={{ maxWidth: 720, padding: "24px 20px 64px" }}>
      <Breadcrumbs
        className="mb-6"
        items={[{ label: "Checkout", href: "/checkout" }, { label: "Order confirmed" }]}
      />

      <div className="panel center" style={{ padding: "48px 28px 40px" }}>
        {paid && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e6f7ec] text-ok ring-1 ring-inset ring-ok/25">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="font-head text-[34px] uppercase leading-none tracking-[0.02em] text-ink lg:text-[40px]">
              Payment received — thank you!
            </h1>
          </>
        )}
        {paymentPending && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#fff4d6] text-gold ring-1 ring-inset ring-gold/25">
              <Clock4 className="h-8 w-8" />
            </div>
            <h1 className="font-head text-[34px] uppercase leading-none tracking-[0.02em] text-ink lg:text-[40px]">
              Payment processing…
            </h1>
            <p className="muted mt-2 text-sm">
              Stripe is finalising the transaction. This page updates automatically when it&apos;s done — or check your order in a minute.
            </p>
          </>
        )}
        {paymentFailed && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-soft text-red ring-1 ring-inset ring-red/25">
              <XCircle className="h-8 w-8" />
            </div>
            <h1 className="font-head text-[34px] uppercase leading-none tracking-[0.02em] text-ink lg:text-[40px]">
              Payment failed
            </h1>
            <p className="muted mt-2 text-sm">
              {latestPayment?.failureMessage ?? "Stripe rejected the card. Try again with a different payment method."}
            </p>
          </>
        )}
        {order && (paid || paymentPending) && (
          <p className="muted mt-3 text-sm">
            Order <span className="kbd">{ref}</span>{" "}
            {paid ? "is on its way." : "saved — we'll start processing once payment clears."}
          </p>
        )}
        {!order && (
          <p className="muted mt-3 text-sm">Your order has been received.</p>
        )}
      </div>

      {order && (
        <div className="panel mt text-left">
          <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Order summary
          </h2>
          <ul className="space-y-1.5" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 text-[13.5px]">
                <span>
                  {i.name} <span className="muted">× {i.quantity}</span>
                </span>
                <span className="tabular-nums">{fmtMoney(Number(i.price) * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="hr" style={{ margin: "12px 0" }} />
          <div className="flex justify-between text-base font-extrabold">
            <span>Total</span>
            <span className="tabular-nums text-red">{fmtMoney(Number(order.total))}</span>
          </div>
          {latestPayment?.receiptUrl && (
            <a
              href={latestPayment.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red"
            >
              View Stripe receipt <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/products" className="btn btn-red">
          Continue shopping
        </Link>
        <Link href="/account/orders" className="btn btn-ghost">
          My orders
        </Link>
        {!paid && (
          <Link href="/checkout" className="btn btn-ghost">
            Try again
          </Link>
        )}
      </div>
    </div>
  );
}
