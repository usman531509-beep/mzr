"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Search, LayoutGrid, Bike, User, ShoppingBag } from "lucide-react";

import { useOverlays } from "@/lib/overlays-store";
import { useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

// Fixed bottom navigation visible on mobile only — reference design
// (.mob-bottom): white bar, ink labels, raised red circular CTA in the
// middle. Five quick-access actions: search · menu · finder · account · cart.

export function MobileBottomBar() {
  const { data: session } = useSession();
  const items = useCart((s) => s.items);
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  const openSearch = useOverlays((s) => s.openSearch);
  const openMenu   = useOverlays((s) => s.openMenu);
  const openFinder = useOverlays((s) => s.openFinder);
  const openCart   = useOverlays((s) => s.openCart);

  const accountHref =
    session?.user
      ? session.user.role === "ADMIN"
        ? "/admin"
        : "/account"
      : "/login";

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-line bg-white",
        "shadow-[0_-4px_14px_rgba(0,0,0,0.08)]",
        "lg:hidden",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Mobile navigation"
    >
      <BarButton label="Search" icon={Search} onClick={openSearch} />
      <BarButton label="Menu"   icon={LayoutGrid} onClick={openMenu} />
      <BarButton label="Finder" icon={Bike}   onClick={openFinder} accent />
      <BarLink   label={session?.user?.role === "ADMIN" ? "Admin" : "Account"}
                 icon={User} href={accountHref} />
      <BarButton label="Basket" icon={ShoppingBag} onClick={openCart} badge={cartCount} />
    </nav>
  );
}

function BarButton({
  label, icon: Icon, onClick, accent, badge,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  accent?: boolean;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2.5 text-ink transition active:bg-soft"
      aria-label={label}
    >
      {accent ? (
        <span className="-mt-7 flex h-12 w-12 items-center justify-center rounded-full bg-red text-white shadow-[0_4px_10px_rgba(227,6,19,0.38)] ring-4 ring-white">
          <Icon className="h-5 w-5" />
        </span>
      ) : (
        <span className="relative">
          <Icon className="h-5 w-5 transition group-active:scale-95" />
          {!!badge && badge > 0 && (
            <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red px-1 text-[9px] font-bold text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>
      )}
      <span className={cn(
        "text-[10px] font-semibold",
        accent ? "font-bold text-red" : "",
      )}>
        {label}
      </span>
    </button>
  );
}

function BarLink({
  label, icon: Icon, href, badge,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2.5 text-ink transition active:bg-soft"
      aria-label={label}
    >
      <span className="relative">
        <Icon className="h-5 w-5 transition group-active:scale-95" />
        {!!badge && badge > 0 && (
          <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red px-1 text-[9px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className="text-[10px] font-semibold">
        {label}
      </span>
    </Link>
  );
}
