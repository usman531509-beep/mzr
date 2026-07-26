"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useCart, type CartItem } from "@/lib/cart-store";

// Reference PDP purchase controls (.qty stepper + red "Add to basket").
// The props contract is unchanged so every existing usage keeps compiling;
// only the rendered markup moved to the theme.css classes. The parent is
// expected to lay these controls out (the PDP wraps them in .pdp-actions,
// a flex row), so this renders a fragment of flex items rather than its
// own wrapper.
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
      <button
        type="button"
        disabled
        className="btn btn-ghost cursor-not-allowed opacity-60"
      >
        Out of stock
      </button>
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
    <>
      {/* Quantity stepper — reference .qty (button / input / button) */}
      <div className="qty bg-white">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          disabled={qty <= 1}
          aria-label="Decrease quantity"
          className="disabled:cursor-default disabled:opacity-40"
        >
          −
        </button>
        <input
          value={qty}
          readOnly
          aria-label="Quantity"
          className="text-sm font-semibold tabular-nums"
        />
        <button
          type="button"
          onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
          disabled={qty >= product.stock}
          aria-label="Increase quantity"
          className="disabled:cursor-default disabled:opacity-40"
        >
          +
        </button>
      </div>

      {/* Add to basket */}
      <button type="button" className="btn btn-red" onClick={handleAdd}>
        {done ? "✓ Added" : "Add to basket"}
      </button>

      {/* Buy now — adds the chosen quantity then heads straight to the cart */}
      <button type="button" className="btn btn-dark" onClick={handleBuyNow}>
        Buy now
      </button>
    </>
  );
}
