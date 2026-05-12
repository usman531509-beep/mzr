import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) return null;

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      createdByAdmin: { select: { name: true, email: true } },
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
