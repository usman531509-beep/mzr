"use client";

import { usePathname } from "next/navigation";

// Wraps the storefront chrome (Topbar, Header, Footer, MobileBottomBar) so we
// can hide it on routes that are standalone pages. Putting the check in a
// single client component keeps the root layout server-rendered and avoids
// refactoring everything into route groups.
//
//  · /pay/<token> — customer-facing payment link, no chrome at all.
//  · /admin       — the reference admin console is a self-contained layout
//                   (dark sticky sidebar + light content, admin/index.html).
//                   It renders no storefront header/nav/footer/mobile bar, so
//                   its full-height sidebar can pin to the viewport top instead
//                   of fighting the storefront header for the sticky slot.
const HIDE_ON = ["/pay/", "/admin"];

// Portal-area routes. Used by the Footer wrap so account/trader users don't
// see the storefront footer stitched under their dashboard. (Admin already
// hides all chrome via HIDE_ON above.) Account + trade-account keep the
// storefront header/nav, matching the reference account pages.
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
