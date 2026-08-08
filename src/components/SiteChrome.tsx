"use client";

import { usePathname } from "next/navigation";

// Wraps the storefront chrome (Topbar, Header, Footer, MobileBottomBar) so we
// can hide it on routes that are standalone pages. Putting the check in a
// single client component keeps the root layout server-rendered and avoids
// refactoring everything into route groups.

// Fully standalone pages — NOTHING renders (no header/footer/mobile bar):
//  · /pay/<token> — customer payment link
//  · /admin       — self-contained admin console
const HIDE_ALL = ["/pay/", "/admin"];

// Split-screen auth/utility pages (AuthShell): hide the top header/footer, but
// KEEP the bottom slot (mobile nav + overlays) so users can still navigate.
const HIDE_CHROME = ["/login", "/register", "/track"];

// Portal-area routes. Used by the Footer wrap so account/trader users don't
// see the storefront footer stitched under their dashboard.
const PORTAL_PREFIXES = ["/admin", "/account", "/trade-account"];

export function SiteChrome({
  children,
  hideOnPortals = false,
  slot = "top",
}: {
  children: React.ReactNode;
  /** When true, additionally hides on the admin/account/trader portal
   *  routes — used for the Footer so portals render flush. */
  hideOnPortals?: boolean;
  /** "top" = header/footer (hidden on auth pages). "bottom" = mobile nav +
   *  overlays (kept on auth pages so navigation still works). */
  slot?: "top" | "bottom";
}) {
  const pathname = usePathname() ?? "";
  if (HIDE_ALL.some((prefix) => pathname.startsWith(prefix))) return null;
  // Header/footer are hidden on the split-screen auth pages; the bottom slot
  // (mobile bottom bar + overlays) stays.
  if (slot === "top" && HIDE_CHROME.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }
  if (hideOnPortals && PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return <>{children}</>;
}
