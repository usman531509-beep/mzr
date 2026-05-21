"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

import { useCart, cartTotals } from "@/lib/cart-store";
import { fmtMoney } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const totals = cartTotals(items);

  return (
    <div className="mx-auto max-w-6xl px-[var(--gutter)] py-6 lg:py-8">
      <Breadcrumbs className="mb-4" items={[{ label: "Cart" }]} />

      <h1 className="mb-6 text-2xl font-bold tracking-tight lg:text-3xl">Your cart</h1>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 p-16 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Your cart is empty</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Browse our catalogue and add some parts to your cart.
            </p>
            <Button asChild size="sm" className="mt-2">
              <Link href="/products">Shop parts</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {items.map((i) => (
              <Card key={i.productId}>
                <CardContent className="flex gap-3 p-4 sm:gap-4 sm:p-5">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded border border-border bg-secondary sm:h-24 sm:w-24">
                    {i.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={i.image} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/products/${i.slug}`}
                      className="line-clamp-2 text-sm font-semibold leading-tight hover:underline sm:text-base"
                    >
                      {i.name}
                    </Link>
                    <div className="mt-1 text-[13px] text-muted-foreground">
                      {fmtMoney(i.price)} each
                    </div>
                    <div className="mt-auto flex items-center gap-3 pt-3">
                      <div className="inline-flex h-8 items-center rounded-md border border-border bg-card">
                        <button
                          type="button"
                          onClick={() => setQty(i.productId, i.quantity - 1)}
                          disabled={i.quantity <= 1}
                          className="flex h-full w-8 items-center justify-center text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                          aria-label="Decrease"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[1.75rem] text-center text-[13px] font-semibold tabular-nums">
                          {i.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(i.productId, i.quantity + 1)}
                          disabled={i.quantity >= i.stock}
                          className="flex h-full w-8 items-center justify-center text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                          aria-label="Increase"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(i.productId)}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold tabular-nums sm:text-lg">
                      {fmtMoney(i.price * i.quantity)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="h-fit lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle>Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="Subtotal" value={fmtMoney(totals.subtotal)} />
              <Row
                label="Shipping"
                value={totals.shipping === 0 ? "FREE" : fmtMoney(totals.shipping)}
              />
              <Row label="VAT (20%)" value={fmtMoney(totals.tax)} />
              <Separator />
              <Row label="Total" value={fmtMoney(totals.total)} bold />
              <div className="space-y-2 pt-2">
                <Button asChild className="w-full" size="lg">
                  <Link href="/checkout">Checkout</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/products">Continue shopping</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-bold" : "text-sm"}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
