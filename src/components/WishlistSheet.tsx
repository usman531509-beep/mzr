"use client";

import Link from "next/link";
import { Heart, ShoppingCart, Trash2, X } from "lucide-react";
import { useOverlays } from "@/lib/overlays-store";
import { useWishlist } from "@/lib/wishlist-store";
import { useCart } from "@/lib/cart-store";
import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

export function WishlistSheet() {
  const open  = useOverlays((s) => s.wishlistOpen);
  const close = useOverlays((s) => s.closeWishlist);
  const items = useWishlist((s) => s.items);
  const remove = useWishlist((s) => s.remove);
  const isAuthed = useWishlist((s) => s.isAuthed);
  const addToCart = useCart((s) => s.add);

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? null : close())}>
      <SheetContent
        side="right"
        className="flex w-full max-w-md flex-col p-0"
        onEscapeKeyDown={() => close()}
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-4 w-4 text-rose-400" />
            Wishlist {items.length > 0 && <span className="text-muted-foreground">· {items.length}</span>}
          </SheetTitle>
          <SheetDescription>
            Saved items follow you across devices.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {!isAuthed ? (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center text-sm text-muted-foreground">
              <Heart className="h-8 w-8" />
              <p>Sign in to save items to your wishlist.</p>
              <Button asChild size="sm" onClick={close}>
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center text-sm text-muted-foreground">
              <Heart className="h-8 w-8" />
              <p>Your wishlist is empty. Tap the heart on a product to save it.</p>
              <Button asChild size="sm" variant="outline" onClick={close}>
                <Link href="/products">Browse parts</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((it) => (
                <li key={it.productId} className="flex gap-3 p-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-border bg-muted">
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${it.slug}`}
                      onClick={close}
                      className="line-clamp-2 text-sm font-medium hover:text-primary"
                    >
                      {it.name}
                    </Link>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {it.brand}
                    </div>
                    <div className="mt-1 text-sm font-semibold">{fmtMoney(it.price)}</div>
                    <div className="mt-2 flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() => {
                          addToCart({
                            productId: it.productId,
                            slug: it.slug,
                            name: it.name,
                            price: it.price,
                            image: it.image ?? undefined,
                            stock: 999, // server re-validates at order time
                          });
                        }}
                      >
                        <ShoppingCart className="h-3 w-3" /> Add to cart
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => remove(it.productId)}
                        aria-label="Remove from wishlist"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-5 py-3 text-right">
          <Button variant="ghost" size="sm" onClick={close}>
            <X className="h-3.5 w-3.5" /> Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
