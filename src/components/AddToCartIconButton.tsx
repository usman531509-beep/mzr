"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-store";

// Compact add-to-cart button for product cards. Stops the click from
// bubbling so the card's wrapping <Link> doesn't navigate to the detail page.

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
      <Button size="sm" className="w-full" disabled>
        Out of stock
      </Button>
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
    <Button
      size="sm"
      className="w-full"
      onClick={handle}
      aria-label={`Add ${product.name} to cart`}
    >
      {added ? <Check className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
      {added ? "Added" : "Add to cart"}
    </Button>
  );
}
