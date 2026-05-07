"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

export type CartLine = {
  productId: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
};

export function UserCartButton({
  userName,
  items,
}: {
  userName: string;
  items: CartLine[];
}) {
  const [open, setOpen] = useState(false);
  const itemCount = items.reduce((s, it) => s + it.quantity, 0);
  const total = items.reduce((s, it) => s + it.price * it.quantity, 0);

  if (itemCount === 0) {
    return <span className="text-xs text-muted-foreground">Empty</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-1 rounded text-left text-sm transition hover:text-primary"
      >
        <ShoppingCart className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
        <span className="underline-offset-2 group-hover:underline">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{userName}&apos;s cart</DialogTitle>
            <DialogDescription>
              {itemCount} {itemCount === 1 ? "item" : "items"} · £{total.toFixed(2)} total
            </DialogDescription>
          </DialogHeader>

          <ul className="divide-y divide-border">
            {items.map((it) => (
              <li key={it.productId} className="flex items-center gap-3 py-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-muted">
                  {it.image ? (
                    <Image
                      src={it.image}
                      alt={it.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{it.name}</div>
                  <div className="text-xs text-muted-foreground">
                    £{it.price.toFixed(2)} × {it.quantity}
                  </div>
                </div>
                <div className="text-sm font-medium">
                  £{(it.price * it.quantity).toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
