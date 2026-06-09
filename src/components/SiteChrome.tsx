"use client";

import { usePathname } from "next/navigation";

// Wraps the storefront chrome (Topbar, Header, Footer, MobileBottomBar) so we
// can hide it on routes that are transactional standalone pages — currently
// just /pay/<token>, the customer-facing payment link. Putting the check in a
// single client component keeps the root layout server-rendered and avoids
// refactoring everything into route groups.

const HIDE_ON = ["/pay/"];

// Portal-area routes — admin/staff console, customer account, trader portal.
// Used by the Footer wrap so admins/users don't see the storefront footer
// stitched under their dashboard.
const PORTAL_PREFIXES = ["/admin", "/account", "/trade-account"];

export function SiteChrome({
  children,
  hideOnPortals = false,
}: {
  children: React.ReactNode;
  /** When true, additionally hides on the admin/account/trader portal
   *  routes — used for the Footer so portals render flush. */
  hideOnPortals?: boolean;
}) {
  const pathname = usePathname() ?? "";
  if (HIDE_ON.some((prefix) => pathname.startsWith(prefix))) return null;
  if (hideOnPortals && PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return <>{children}</>;
}
