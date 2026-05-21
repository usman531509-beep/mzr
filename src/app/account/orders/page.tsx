import Link from "next/link";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, ShieldCheck, Truck } from "lucide-react";
import { InvoiceDialog } from "@/components/InvoiceDialog";

// Per-request render so each customer sees their own orders (and any tracking
// info added since their last visit) without stale cached HTML.
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) return null;

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      createdByAdmin: { select: { name: true, email: true } },
      courier: { select: { name: true, trackingUrl: true } },
    },
  });

  // Lazily backfill missing paymentTokens on PENDING orders so the customer
  // can always resume payment from this page — covers historical orders
  // placed before the token was minted automatically at checkout.
  const needsToken = orders.filter((o) => o.status === "PENDING" && !o.paymentToken);
  if (needsToken.length > 0) {
    await Promise.all(
      needsToken.map(async (o) => {
        const token = randomBytes(18).toString("base64url");
        await prisma.order.update({ where: { id: o.id }, data: { paymentToken: token } });
        o.paymentToken = token;
      }),
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">My orders</h1>
        <p className="text-sm text-muted-foreground">{orders.length} order{orders.length === 1 ? "" : "s"} placed.</p>
      </header>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            You haven't placed an order yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-mono text-[11px] text-muted-foreground">Order {o.orderNumber ?? o.id}</div>
                      {o.createdByAdmin && (
                        <Badge className="gap-1 bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-500/30 hover:bg-blue-500/15">
                          <ShieldCheck className="h-3 w-3" /> Created by admin
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm">{new Date(o.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={o.status} />
                    <div className="text-lg font-bold">{fmtMoney(Number(o.total))}</div>
                  </div>
                </div>

                <Separator className="my-3" />

                <ul className="space-y-1">
                  {o.items.map((i) => (
                    <li key={i.id} className="flex justify-between text-sm">
                      <span>{i.name} <span className="text-muted-foreground">× {i.quantity}</span></span>
                      <span className="tabular-nums">{fmtMoney(Number(i.price) * i.quantity)}</span>
                    </li>
                  ))}
                </ul>

                {o.trackingNumber && o.courier && (() => {
                  // Append the tracking number to the courier's tracking URL as
                  // a path segment so the customer lands directly on the
                  // shipment page (mirrors the /track flow).
                  const n = encodeURIComponent(o.trackingNumber);
                  const base = o.courier.trackingUrl;
                  const trackHref = base.endsWith("/") ? `${base}${n}` : `${base}/${n}`;
                  return (
                    <>
                      <Separator className="my-3" />
                      <div className="rounded-md border border-border bg-muted/30 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              <Truck className="h-3.5 w-3.5" /> Tracking
                            </div>
                            <div className="mt-1 text-sm font-medium">{o.courier.name}</div>
                            <div className="font-mono text-xs text-muted-foreground">{o.trackingNumber}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <Button asChild size="sm" variant="outline">
                              <a href={trackHref} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" /> Track on {o.courier.name}
                              </a>
                            </Button>
                            <Link
                              href={`/track?courier=${encodeURIComponent(o.courier.name)}&number=${encodeURIComponent(o.trackingNumber)}`}
                              className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                            >
                              Use tracking page →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                <Separator className="my-3" />

                {/* Admin-created orders that are still PENDING carry a
                    paymentToken. Surface a prominent Pay now CTA so the
                    customer can settle without hunting for the email. */}
                {o.status === "PENDING" && o.paymentToken && (
                  <div className="-mt-1 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                    <div className="text-sm">
                      <div className="font-medium">Payment due</div>
                      <div className="text-xs text-muted-foreground">
                        Complete payment to ship this order.
                      </div>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/pay/${o.paymentToken}`}>
                        <CreditCard className="h-3.5 w-3.5" /> Pay now
                      </Link>
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    Shipping to: {[
                      o.customerName,
                      o.shippingAddress,
                      o.shippingAddressLine2,
                      o.shippingCity,
                      o.shippingCounty,
                      o.shippingPostcode,
                      o.shippingCountry,
                    ].filter(Boolean).join(", ")}
                  </div>
                  <InvoiceDialog
                    order={{
                      id: o.id,
                      orderNumber: o.orderNumber,
                      status: o.status,
                      total: o.total.toString(),
                      shippingFee: o.shippingFee.toString(),
                      discount: o.discount.toString(),
                      createdAt: o.createdAt,
                      customerName: o.customerName,
                      customerEmail: o.customerEmail,
                      customerPhone: o.customerPhone,
                      shippingAddress: o.shippingAddress,
                      shippingAddressLine2: o.shippingAddressLine2,
                      shippingCity: o.shippingCity,
                      shippingCounty: o.shippingCounty,
                      shippingPostcode: o.shippingPostcode,
                      shippingCountry: o.shippingCountry,
                      notes: o.notes,
                      items: o.items.map((it) => ({
                        id: it.id,
                        name: it.name,
                        price: it.price.toString(),
                        quantity: it.quantity,
                      })),
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
