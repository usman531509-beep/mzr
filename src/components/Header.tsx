"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { ChevronDown, LayoutDashboard, LogOut, ShieldCheck, ShoppingBag, Truck, User as UserIcon } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useWishlist } from "@/lib/wishlist-store";
import { useOverlays } from "@/lib/overlays-store";
import { Topbar } from "@/components/Topbar";
import { MegaMenu, type MegaColumn } from "@/components/MegaMenu";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type NavCategory = { name: string; slug: string; count: number };
type NavBrand = { name: string; slug: string };

export function Header({
  categories = [],
  brands = [],
}: {
  categories?: NavCategory[];
  brands?: NavBrand[];
}) {
  const { data: session } = useSession();
  const items = useCart((s) => s.items);
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);
  const wishlistCount = useWishlist((s) => s.items.length);
  const openSearch   = useOverlays((s) => s.openSearch);
  const openCart     = useOverlays((s) => s.openCart);
  const openWishlist = useOverlays((s) => s.openWishlist);

  // Build live mega menus from the catalogue. The "Parts" mega groups all
  // categories that actually have products, split into 3 columns by name so
  // the dropdown stays balanced. The "Brands" mega lists every brand by name.
  const partsCols  = chunk(categories.filter((c) => c.count > 0).map(toCatItem), 3);
  const brandsCols = chunk(brands.map(toBrandItem), 2);

  return (
    <>
      <Topbar />

      {/* Desktop nav — hidden on mobile (mobile uses MobileBottomBar). */}
      <header className="sticky top-0 z-30 hidden border-b border-white/10 bg-ink lg:block">
        <div className="mx-auto flex h-16 max-w-site items-center gap-2 px-[var(--gutter)]">
          {/* Home affordance — small logo mark (the big logo lives in the hero) */}
          <Link
            href="/"
            className="mr-4 flex shrink-0 items-center transition hover:opacity-80"
            aria-label="MZR Spare home"
          >
            <Image
              src="/logo.png"
              alt="MZR Spare"
              width={617}
              height={405}
              priority
              className="h-16 w-auto"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="flex h-full flex-1 items-stretch">
            {partsCols.length > 0 ? (
              <NavItem label="Parts">
                <MegaMenu columns={partsCols} />
              </NavItem>
            ) : (
              <SimpleLink href="/products" label="Parts" />
            )}
            {brandsCols.length > 0 ? (
              <NavItem label="Brands">
                <MegaMenu columns={brandsCols} width="narrow" />
              </NavItem>
            ) : null}
            <SimpleLink href="/products?sort=new" label="New In" />
            <SimpleLink href="/products" label="All Products" />
          </nav>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            <Link href="/track" className="btn-trade mr-1">Track Order</Link>
            <Link href="/trade-account" className="btn-trade">Trade Account</Link>

            <ActionBtn label="Search" onClick={openSearch}>
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            </ActionBtn>

            {session?.user ? (() => {
              const role = session.user.role;
              const hasAdminPanel = role === "ADMIN" || role === "MANAGER" || role === "STAFF";
              const triggerLabel = hasAdminPanel ? role.charAt(0) + role.slice(1).toLowerCase() : "Account";
              return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-12 flex-col items-center justify-center gap-0.5 rounded px-3 text-white/70 transition hover:bg-white/5 hover:text-white"
                    aria-label={hasAdminPanel ? "Admin menu" : "Account menu"}
                  >
                    <span className="flex items-center gap-1">
                      {hasAdminPanel ? (
                        <ShieldCheck className="h-[18px] w-[18px]" />
                      ) : (
                        <UserIcon className="h-[18px] w-[18px]" />
                      )}
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                      {triggerLabel}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {hasAdminPanel ? `Signed in as ${role.toLowerCase()}` : "Signed in"}
                    </span>
                    <span className="truncate text-sm font-medium normal-case">
                      {session.user.name ?? session.user.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {hasAdminPanel ? (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/account" className="cursor-pointer">
                          <UserIcon className="h-4 w-4" />
                          My account
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/account/orders" className="cursor-pointer">
                          <ShoppingBag className="h-4 w-4" />
                          My orders
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/track" className="cursor-pointer">
                          <Truck className="h-4 w-4" />
                          Track order
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              );
            })() : (
              <Link href="/login" className="flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded text-white/70 transition hover:bg-white/5 hover:text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Sign in</span>
              </Link>
            )}

            <button
              type="button"
              onClick={openWishlist}
              className="relative flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded text-white/70 transition hover:bg-white/5 hover:text-white"
              aria-label="Open wishlist"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Wishlist</span>
              {wishlistCount > 0 && (
                <span className="absolute right-1 top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 font-mono text-[9px] font-bold text-white">
                  {wishlistCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={openCart}
              className="relative flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded text-white/70 transition hover:bg-white/5 hover:text-white"
              aria-label="Open cart"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Basket</span>
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red px-1 font-mono text-[9px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-red/50 to-transparent" />
      </header>
    </>
  );
}

function NavItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="nav-item relative flex items-stretch">
      <button className="flex h-full items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3.5 text-[13.5px] font-medium text-white/85 transition hover:border-red hover:text-white">
        {label}
        <span className="text-[9px] opacity-50">▼</span>
      </button>
      {children}
    </div>
  );
}

function SimpleLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex h-full items-center whitespace-nowrap border-b-2 border-transparent px-3.5 text-[13.5px] font-medium text-white/85 transition hover:border-red hover:text-white"
    >
      {label}
    </Link>
  );
}

function ActionBtn({
  children, label, onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded text-white/70 transition hover:bg-white/5 hover:text-white"
      aria-label={label}
    >
      <span className="[&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg]:fill-none [&>svg]:stroke-current [&>svg]:stroke-[1.5] [&>svg]:[stroke-linecap:round] [&>svg]:[stroke-linejoin:round]">
        {children}
      </span>
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

// ---- Mega-menu helpers (real catalogue → MegaColumn[]) -------------------

function toCatItem(c: NavCategory) {
  return {
    label: c.count > 0 ? `${c.name}` : c.name,
    href: `/products?category=${c.slug}`,
  };
}

function toBrandItem(b: NavBrand) {
  return { label: b.name, href: `/products?brand=${b.slug}` };
}

function chunk<T>(arr: T[], cols: number): MegaColumn[] {
  if (arr.length === 0) return [];
  // Split items roughly evenly across N columns, alphabetically. No per-column
  // heading — the items are self-explanatory and per-letter groupings just
  // add visual noise.
  const perCol = Math.ceil(arr.length / cols);
  const out: MegaColumn[] = [];
  for (let i = 0; i < cols; i++) {
    const items = arr.slice(i * perCol, (i + 1) * perCol);
    if (items.length === 0) continue;
    out.push({ heading: "", items: items as { label: string; href: string }[] });
  }
  return out;
}
