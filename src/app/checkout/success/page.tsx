import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const order = id
    ? await prisma.order.findUnique({ where: { id }, include: { items: true } })
    : null;

  return (
    <div className="mx-auto max-w-2xl px-[var(--gutter)] py-6 lg:py-8">
      <Breadcrumbs
        className="mb-6"
        items={[{ label: "Checkout", href: "/checkout" }, { label: "Order confirmed" }]}
      />

      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
          Thank you for your order!
        </h1>
        {order ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Order <span className="font-mono text-foreground">{order.id}</span> placed successfully.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Your order has been received.</p>
        )}
      </div>

      {order && (
        <Card className="mt-6 text-left">
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Order summary
            </h2>
            <ul className="space-y-1.5">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 text-[13.5px]">
                  <span>
                    {i.name} <span className="text-muted-foreground">× {i.quantity}</span>
                  </span>
                  <span className="tabular-nums">{fmtMoney(Number(i.price) * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">{fmtMoney(Number(order.total))}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/products">Continue shopping</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/account/orders">My orders</Link>
        </Button>
      </div>
    </div>
  );
}
