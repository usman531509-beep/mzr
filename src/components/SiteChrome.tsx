"use client";

import { usePathname } from "next/navigation";

// Wraps the storefront chrome (Topbar, Header, Footer, MobileBottomBar) so we
// can hide it on routes that are transactional standalone pages — currently
// just /pay/<token>, the customer-facing payment link. Putting the check in a
// single client component keeps the root layout server-rendered and avoids
// refactoring everything into route groups.

const HIDE_ON = ["/pay/"];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (HIDE_ON.some((prefix) => pathname.startsWith(prefix))) return null;
  return <>{children}</>;
}
