import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ShieldCheck, Truck } from "lucide-react";

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

                <div className="text-xs text-muted-foreground">
                  Shipping to: {o.customerName}, {o.shippingAddress}, {o.shippingCity}, {o.shippingCountry}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
