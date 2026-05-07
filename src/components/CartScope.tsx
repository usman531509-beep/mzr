"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { scopeCartToUser } from "@/lib/cart-store";

export function CartScope() {
  const { data: session, status } = useSession();
  useEffect(() => {
    if (status === "loading") return;
    scopeCartToUser(session?.user?.id ?? session?.user?.email ?? null);
  }, [status, session?.user?.id, session?.user?.email]);
  return null;
}
