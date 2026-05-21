// Public payment page for orders an admin placed on a customer's behalf.
// Anyone with the unguessable token can view the order summary and pay; the
// existing Stripe webhook flips status to PAID once the customer completes.

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CheckCircle2, Lock, ShieldCheck } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PayClient } from "./PayClient";
import { PaidCartClear } from "./PaidCartClear";

export const dynamic = "force-dynamic";

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%231C1E21'/></svg>`,
  );

export default async function PayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await prisma.order.findUnique({
    where: { paymentToken: token },
    include: {
      items: {
        include: {
          product: { select: { images: true } },
        },
      },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!order) notFound();

  const subtotal = order.items.reduce(
    (s, it) => s + Number(it.price) * it.quantity,
    0,
  );
  const shipping = Number(order.shippingFee ?? 0);
  const discount = Number(order.discount ?? 0);
  const taxable = Math.max(0, subtotal + shipping - discount);
  const tax = +(taxable * 0.20).toFixed(2);
  const total = Number(order.total);

  // Treat any of these as "already done" — show the success screen instead
  // of the payment form. The Payment row is the source of truth, with the
  // Order status as a fallback for legacy admin-marked rows.
  const isPaid =
    order.payments[0]?.status === "SUCCEEDED" ||
    ["PAID", "SHIPPED", "DELIVERED"].includes(order.status);
  const receiptUrl = order.payments[0]?.receiptUrl ?? null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Soft ambient gradient so the page feels like a polished payment
          flow rather than a bare modal. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(232,21,27,0.10),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.04),transparent_55%)]"
      />

      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 lg:px-8 lg:py-7">
        <Link href="/" className="inline-flex items-center" aria-label="MZR Parts home">
          <Image
            src="/logo.png"
            alt="MZR Parts"
            width={617}
            height={405}
            className="h-10 w-auto lg:h-12"
            priority
          />
        </Link>
        <div className="hidden items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground sm:flex">
          <Lock className="h-3.5 w-3.5" /> Secure payment
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 lg:px-8">
        {/* Order heading */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Invoice
            </div>
            <h1 className="mt-1 font-head text-3xl font-bold tracking-tight lg:text-4xl">
              {order.orderNumber ?? `#${order.id.slice(0, 8)}`}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Placed {new Date(order.createdAt).toLocaleDateString("en-GB", { dateStyle: "long" })}
            </p>
          </div>
          {isPaid ? (
            <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/15">
              <CheckCircle2 className="h-3.5 w-3.5" /> Paid
            </Badge>
          ) : (
            <Badge className="gap-1.5 bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/15">
              Awaiting payment · {fmtMoney(total)}
            </Badge>
          )}
        </div>

        {isPaid ? (
          <Card className="overflow-hidden">
            <PaidCartClear />
            <div className="bg-emerald-500/10 px-8 py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">Payment completed</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Thanks — we&apos;ve received {fmtMoney(total)} and the order is
                being processed. A receipt has been emailed to {order.customerEmail}.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Button asChild variant="default" size="sm">
                  <Link href="/account/orders">View order history</Link>
                </Button>
                {receiptUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
                      Stripe receipt
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
            {/* Order summary */}
            <Card>
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Your order
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {order.items.length} {order.items.length === 1 ? "item" : "items"}
                  </span>
                </div>

                <ul className="space-y-3">
                  {order.items.map((it) => {
                    const img = it.product?.images?.[0] ?? PLACEHOLDER;
                    return (
                      <li key={it.id} className="flex items-center gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{it.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {fmtMoney(Number(it.price))} × {it.quantity}
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-semibold tabular-nums">
                          {fmtMoney(Number(it.price) * it.quantity)}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <Separator />

                <div className="space-y-1.5 text-sm">
                  <Row label="Subtotal" value={fmtMoney(subtotal)} />
                  <Row label="Shipping" value={shipping > 0 ? fmtMoney(shipping) : "Free"} />
                  {discount > 0 && <Row label="Discount" value={`−${fmtMoney(discount)}`} muted />}
                  <Row label="VAT (20%)" value={fmtMoney(tax)} />
                </div>

                <Separator />

                <div className="flex items-baseline justify-between">
                  <span className="text-sm uppercase tracking-wider text-muted-foreground">Total due</span>
                  <span className="font-head text-2xl font-bold tabular-nums">{fmtMoney(total)}</span>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs">
                  <div className="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-wider text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" /> Ship to
                  </div>
                  <div className="text-foreground">{order.customerName}</div>
                  <div className="text-muted-foreground">
                    {order.shippingAddress}{order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ""}
                  </div>
                  <div className="text-muted-foreground">
                    {order.shippingCity}{order.shippingCounty ? `, ${order.shippingCounty}` : ""}
                  </div>
                  <div className="font-mono text-muted-foreground">{order.shippingPostcode} · {order.shippingCountry}</div>
                </div>
              </CardContent>
            </Card>

            {/* Payment */}
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Pay securely
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Lock className="h-3 w-3" /> 256-bit TLS
                  </span>
                </div>
                <PayClient token={token} total={total} orderId={order.id} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trust footer */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3 w-3" /> Powered by Stripe
          </span>
          <span>We never see your card details</span>
          <span>VAT applied at 20%</span>
          <Link href="/" className="hover:text-foreground">© MZR Parts</Link>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={muted ? "text-muted-foreground" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
