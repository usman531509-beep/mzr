"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { useCart } from "@/lib/cart-store";

// Compact add-to-cart button for product cards, styled as the reference
// card's red "+ Add" pill (.h-add). Stops the click from bubbling so the
// card's wrapping <Link> doesn't navigate to the detail page.

type Item = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
};

export function AddToCartIconButton({ product }: { product: Item }) {
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);

  if (product.stock <= 0) {
    return (
      <button type="button" className="h-add !bg-soft !text-muted-foreground" disabled>
        Out of stock
      </button>
    );
  }

  const handle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add(product, 1);
    setAdded(true);
    toast.success(`Added ${product.name} to cart`);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <button
      type="button"
      className="h-add"
      onClick={handle}
      aria-label={`Add ${product.name} to cart`}
    >
      {added ? (
        <>
          <Check className="h-3.5 w-3.5" /> Added
        </>
      ) : (
        "+ Add"
      )}
    </button>
  );
}
