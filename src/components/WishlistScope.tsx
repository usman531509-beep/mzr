"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useWishlist } from "@/lib/wishlist-store";

// Loads / clears the wishlist whenever the auth state changes. Mounted at
// the root layout level next to CartScope so it's always in sync.
export function WishlistScope() {
  const { data: session, status } = useSession();
  const load = useWishlist((s) => s.load);
  const clear = useWishlist((s) => s.clear);

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.id) {
      void load();
    } else {
      clear();
    }
  }, [status, session?.user?.id, load, clear]);

  return null;
}
