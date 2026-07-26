"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useCart } from "@/lib/cart-store";
import { useWishlist } from "@/lib/wishlist-store";
import { useOverlays } from "@/lib/overlays-store";
import { NavSearch } from "@/components/NavSearch";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, LogOut, Phone, ShoppingBag, Truck, User as UserIcon } from "lucide-react";
import type { NavCategoryNode } from "@/lib/nav-cache";
import { SITE_PHONE, SITE_PHONE_TEL } from "@/lib/site";

type NavBrand = { id?: string; name: string; slug: string };
type NavProductBrand = { name: string; slug: string };
type NavModel = { id: string; name: string; brandId: string };

// ---------------------------------------------------------------------------
// Storefront header — reference design (engine-aid-hub):
//   · white header row: logo / search / icon actions
//   · red nav bar underneath with CSS-hover mega menus (.h-mega / .mp-*)
// All data comes from the cached nav payload; all interactive logic (cart,
// wishlist, session, search) is preserved from the previous header.
// ---------------------------------------------------------------------------

export function Header({
  tree = [],
  brands = [],
  productBrands = [],
  models = [],
}: {
  tree?: NavCategoryNode[];
  brands?: NavBrand[];
  productBrands?: NavProductBrand[];
  models?: NavModel[];
}) {
  const { data: session } = useSession();
  const items = useCart((s) => s.items);
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);
  const wishlistCount = useWishlist((s) => s.items.length);
  const openCart     = useOverlays((s) => s.openCart);
  const openWishlist = useOverlays((s) => s.openWishlist);

  const role = session?.user?.role;
  const hasAdminPanel = role === "ADMIN" || role === "MANAGER" || role === "STAFF";

  return (
    <>
      {/* ---------- White header row ---------- */}
      <header className="h-header">
        <div className="h-header-in">
          <Link href="/" className="h-logo" aria-label="MZR Spare home">
            <Image
              src="/logo.png"
              alt="MZR Spare — Motorbike Parts Specialist"
              width={617}
              height={405}
              priority
              className="h-[72px] w-auto"
            />
          </Link>

          {/* Mobile-only click-to-call. On desktop the number lives in the top
              utility strip; on mobile the strip is hidden, so surface it here.
              Search is intentionally omitted on mobile — it's in the bottom bar. */}
          <a href={`tel:${SITE_PHONE_TEL}`} className="h-phone-mobile" aria-label={`Call ${SITE_PHONE}`}>
            <Phone />
            {SITE_PHONE}
          </a>

          <div className="h-search-wrap">
            <NavSearch />
          </div>

          <div className="h-actions">
            <Link className="h-act" href="/track">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0v10l-8 4m8-14l-8 4m0 10V11m0 10l-8-4V7m8 4L4 7" /></svg>
              Track
            </Link>

            {session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="h-act" aria-label={hasAdminPanel ? "Admin menu" : "Account menu"}>
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    {hasAdminPanel ? role!.charAt(0) + role!.slice(1).toLowerCase() : "Account"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {hasAdminPanel ? `Signed in as ${role!.toLowerCase()}` : "Signed in"}
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
            ) : (
              <Link className="h-act" href="/login">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Account
              </Link>
            )}

            <button type="button" className="h-act" onClick={openWishlist} aria-label="Open wishlist">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              Wishlist
              {wishlistCount > 0 && <span className="h-badge">{wishlistCount > 99 ? "99" : wishlistCount}</span>}
            </button>

            <button type="button" className="h-act" onClick={openCart} aria-label="Open basket">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Basket
              {cartCount > 0 && <span className="h-badge">{cartCount > 99 ? "99" : cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* ---------- Red nav bar with mega menus ---------- */}
      <nav className="h-nav">
        <div className="h-nav-in">
          {tree.length > 0 && <CategoriesMega tree={tree} />}
          {brands.length > 0 && <BikesMega brands={brands} models={models} />}
          {productBrands.length > 0 && <BrandsMega productBrands={productBrands} />}
          <Link href="/products">All Products</Link>
          {hasAdminPanel && <Link href="/admin">Admin</Link>}
          {session?.user && !hasAdminPanel && <Link href="/account">My Account</Link>}
          <Link href="/trade-account">Trade Account</Link>
          {!session?.user && <Link href="/login" className="h-cta">Login / Register</Link>}
        </div>
      </nav>
    </>
  );
}

// ---------------------------------------------------------------------------
// Mega menus — markup mirrors the reference (.h-mega / .mp-side / .mp-pane);
// visibility is pure CSS (:hover) from theme.css, no JS state needed.
// ---------------------------------------------------------------------------

type PaneCol = { heading: string; headingHref?: string; items: { label: string; href: string }[] };

function Caret() {
  return (
    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function MegaShell({ label, rows }: { label: string; rows: { label: string; href: string; cols: PaneCol[]; promo?: React.ReactNode }[] }) {
  return (
    <div className="h-mega">
      <span className="h-mega-trigger">{label} <Caret /></span>
      <div className="h-mega-panel">
        <div className="mp-inner">
          <aside className="mp-side">
            {rows.map((row) => (
              <div className="mp-row" key={row.label}>
                <Link className="mp-link" href={row.href}>{row.label}</Link>
                <div className="mp-pane">
                  {row.cols.map((col, i) => (
                    <div className="mp-col" key={`${col.heading}-${i}`}>
                      {col.heading ? <h5>{col.heading}</h5> : null}
                      <ul>
                        {col.items.map((it) => (
                          <li key={it.href + it.label}><Link href={it.href}>{it.label}</Link></li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {row.promo}
                </div>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </div>
  );
}

function chunkInto<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Top-level categories become side rows; children/grandchildren fill the pane. */
function CategoriesMega({ tree }: { tree: NavCategoryNode[] }) {
  const catHref = (n: NavCategoryNode) => `/products?category=${n.path}`;

  const rows = tree.slice(0, 10).map((top) => {
    const withKids = top.children.filter((c) => c.children.length > 0);
    const leaves = top.children.filter((c) => c.children.length === 0);

    const cols: PaneCol[] = withKids.slice(0, 4).map((c) => ({
      heading: c.name,
      headingHref: catHref(c),
      items: [
        ...c.children.slice(0, 6).map((g) => ({ label: g.name, href: catHref(g) })),
        ...(c.children.length > 6 ? [{ label: `All ${c.name} →`, href: catHref(c) }] : []),
      ],
    }));

    // Categories without sub-groups get listed in plain columns.
    if (cols.length < 4 && leaves.length > 0) {
      const space = 4 - cols.length;
      const chunks = chunkInto(leaves, Math.max(6, Math.ceil(leaves.length / space)));
      for (const chunk of chunks.slice(0, space)) {
        cols.push({
          heading: cols.length === 0 ? "Browse" : "",
          items: chunk.map((c) => ({ label: c.name, href: catHref(c) })),
        });
      }
    }

    if (cols.length === 0) {
      cols.push({ heading: top.name, items: [{ label: `Shop all ${top.name} →`, href: catHref(top) }] });
    }

    return { label: top.name, href: catHref(top), cols };
  });

  return <MegaShell label="Categories" rows={rows} />;
}

/** Bike brands as side rows; that brand's models fill the pane. */
function BikesMega({ brands, models }: { brands: NavBrand[]; models: NavModel[] }) {
  const rows = brands.slice(0, 12).map((b) => {
    const own = models.filter((m) => m.brandId === b.id);
    const chunks = chunkInto(own.slice(0, 24), 6);
    const cols: PaneCol[] =
      chunks.length > 0
        ? chunks.map((chunk, i) => ({
            heading: i === 0 ? `${b.name} models` : "",
            items: chunk.map((m) => ({
              label: m.name,
              href: `/products?brand=${b.slug}&model=${m.id}`,
            })),
          }))
        : [{ heading: b.name, items: [] }];
    // Always finish with the "all parts for this bike brand" link.
    cols[cols.length - 1].items.push({ label: `All ${b.name} →`, href: `/products?brand=${b.slug}` });
    return { label: b.name, href: `/products?brand=${b.slug}`, cols };
  });

  return <MegaShell label="Shop by Bike" rows={rows} />;
}

/** Part manufacturers, chunked alphabetically into side rows. */
function BrandsMega({ productBrands }: { productBrands: NavProductBrand[] }) {
  const href = (b: NavProductBrand) => `/products?productBrand=${b.slug}`;
  const groups = chunkInto(productBrands, 16);

  const rows = groups.slice(0, 8).map((group) => {
    const first = group[0].name.charAt(0).toUpperCase();
    const last = group[group.length - 1].name.charAt(0).toUpperCase();
    const label = groups.length === 1 ? "All Brands" : first === last ? first : `${first} – ${last}`;
    const cols: PaneCol[] = chunkInto(group, 4).map((chunk) => ({
      heading: "",
      items: chunk.map((b) => ({ label: b.name, href: href(b) })),
    }));
    return { label, href: "/products", cols };
  });

  return <MegaShell label="Shop by Brand" rows={rows} />;
}
