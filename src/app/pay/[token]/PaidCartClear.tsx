"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-store";

// Tiny side-effect component mounted inside the success card on /pay/<token>.
// When an already-paid order is rendered (page server-rendered with isPaid),
// the customer's local cart may still hold the items they just paid for —
// wipe it so they don't see ghost items after returning to the store.

export function PaidCartClear() {
  const clear = useCart((s) => s.clear);
  useEffect(() => { clear(); }, [clear]);
  return null;
}
