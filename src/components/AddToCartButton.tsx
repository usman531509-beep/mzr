"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Check, ShoppingCart, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/lib/cart-store";

export function AddToCartButton({
  product,
}: {
  product: Omit<CartItem, "quantity">;
}) {
  const add = useCart((s) => s.add);
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);

  if (product.stock <= 0) {
    return (
      <Button disabled className="w-full" size="lg">
        Out of stock
      </Button>
    );
  }

  const handleAdd = () => {
    add(product, qty);
    setDone(true);
    toast.success(`Added ${qty} × ${product.name} to cart`);
    setTimeout(() => setDone(false), 1500);
  };

  const handleBuyNow = () => {
    add(product, qty);
    router.push("/cart");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Quantity stepper */}
      <div className="inline-flex h-10 items-center rounded-md border border-border bg-card">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          disabled={qty <= 1}
          className="flex h-full w-10 items-center justify-center text-muted-foreground transition hover:text-foreground disabled:opacity-40"
          aria-label="Decrease quantity"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums">
          {qty}
        </span>
        <button
          type="button"
          onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
          disabled={qty >= product.stock}
          className="flex h-full w-10 items-center justify-center text-muted-foreground transition hover:text-foreground disabled:opacity-40"
          aria-label="Increase quantity"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Add to cart */}
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={handleAdd}
        className="flex-1 min-w-[10rem]"
      >
        {done ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
        {done ? "Added" : "Add to cart"}
      </Button>

      {/* Buy now */}
      <Button type="button" size="lg" onClick={handleBuyNow}>
        <Zap className="h-4 w-4" />
        Buy now
      </Button>
    </div>
  );
}
