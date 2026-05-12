import Link from "next/link";
import { Package, ShoppingBag, ArrowRight } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AccountOverview() {
  const session = await auth();
  if (!session?.user) return null;

  const [orders, totalSpentAgg] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { items: true },
    }),
    prisma.order.aggregate({
      where: { userId: session.user.id },
      _sum: { total: true },
      _count: { _all: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Hi, {session.user.name?.split(" ")[0] ?? "there"}.</h1>
        <p className="text-sm text-muted-foreground">Welcome back to MZR Parts.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><ShoppingBag className="h-5 w-5" /></div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Orders placed</div>
              <div className="text-2xl font-bold">{totalSpentAgg._count._all}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-300"><Package className="h-5 w-5" /></div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total spent</div>
              <div className="text-2xl font-bold">{fmtMoney(Number(totalSpentAgg._sum.total ?? 0))}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent orders</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/account/orders">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">No orders yet.</p>
              <Button asChild className="mt-3" size="sm">
                <Link href="/products">Start shopping</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[11px] text-muted-foreground">{o.orderNumber ?? `${o.id.slice(0, 12)}…`}</div>
                    <div className="text-sm">
                      {o.items.length} item{o.items.length === 1 ? "" : "s"} · {new Date(o.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant="secondary">{o.status}</Badge>
                  <div className="font-bold tabular-nums">{fmtMoney(Number(o.total))}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
