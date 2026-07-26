"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";

import { useCart, cartTotals } from "@/lib/cart-store";
import { useOverlays } from "@/lib/overlays-store";
import { fmtMoney } from "@/lib/format";

import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Slide-in cart panel from the right edge. Same component used on desktop
// and mobile — Sheet's `side="right"` handles both.

export function CartSheet() {
  const router = useRouter();
  const open  = useOverlays((s) => s.cartOpen);
  const close = useOverlays((s) => s.closeCart);

  const items   = useCart((s) => s.items);
  const setQty  = useCart((s) => s.setQty);
  const remove  = useCart((s) => s.remove);
  const totals  = cartTotals(items);
  const count   = items.reduce((s, i) => s + i.quantity, 0);

  const checkout = () => {
    close();
    router.push("/checkout");
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && close()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-line bg-white p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-line px-5 py-4">
          <SheetTitle className="flex items-center gap-2 font-head text-xl uppercase tracking-[0.04em] text-ink">
            <ShoppingBag className="h-4 w-4 text-red" />
            Your basket
            {count > 0 && (
              <span className="rounded-full bg-red px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="text-[12px] text-muted-foreground">
            Review your parts before checkout.
          </SheetDescription>
        </SheetHeader>

        {/* Body */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            <h3 className="text-base font-bold text-ink">Your basket is empty</h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              Browse parts and tap "Add to cart" to start filling it.
            </p>
            <Button asChild size="sm" className="mt-2 font-bold uppercase tracking-wider" onClick={close}>
              <Link href="/products">Shop parts</Link>
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <ul className="space-y-3">
              {items.map((i) => (
                <li
                  key={i.productId}
                  className="flex gap-3 rounded-lg border border-line bg-white p-3 shadow-sm"
                >
                  <Link
                    href={`/products/${i.slug}`}
                    onClick={close}
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-line bg-white"
                  >
                    {i.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={i.image} alt="" className="h-full w-full object-contain p-0.5" />
                    ) : null}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/products/${i.slug}`}
                      onClick={close}
                      className="line-clamp-2 text-[13.5px] font-bold leading-tight text-ink hover:text-red"
                    >
                      {i.name}
                    </Link>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {fmtMoney(i.price)} each
                    </div>
                    <div className="mt-auto flex items-center gap-2 pt-1.5">
                      <div className="inline-flex h-7 items-center overflow-hidden rounded-lg border border-line bg-white">
                        <button
                          type="button"
                          onClick={() => setQty(i.productId, i.quantity - 1)}
                          disabled={i.quantity <= 1}
                          className="flex h-full w-7 items-center justify-center text-ink/60 transition hover:bg-soft hover:text-red disabled:opacity-40"
                          aria-label="Decrease"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[1.5rem] border-x border-line text-center text-[12px] font-semibold tabular-nums text-ink">
                          {i.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(i.productId, i.quantity + 1)}
                          disabled={i.quantity >= i.stock}
                          className="flex h-full w-7 items-center justify-center text-ink/60 transition hover:bg-soft hover:text-red disabled:opacity-40"
                          aria-label="Increase"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(i.productId)}
                        className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-muted-foreground transition hover:text-red"
                      >
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-bold tabular-nums text-ink">
                      {fmtMoney(i.price * i.quantity)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-line bg-soft px-5 py-4">
            <div className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={fmtMoney(totals.subtotal)} />
              <Row
                label="Shipping"
                value={totals.shipping === 0 ? "FREE" : fmtMoney(totals.shipping)}
              />
              <Row label="VAT (20%)" value={fmtMoney(totals.tax)} />
            </div>
            <Separator className="my-3 bg-line" />
            <div className="flex justify-between text-base font-extrabold">
              <span className="text-ink">Total</span>
              <span className="tabular-nums text-red">{fmtMoney(totals.total)}</span>
            </div>

            <div className="mt-4 space-y-2">
              <Button
                onClick={checkout}
                className="w-full font-extrabold uppercase tracking-wider"
                size="lg"
              >
                Checkout <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-line bg-white text-ink hover:border-ink"
                onClick={close}
              >
                <Link href="/cart">View full basket</Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-bold" : "text-sm"}`}>
      <span className={bold ? "text-ink" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums text-ink">{value}</span>
    </div>
  );
}
