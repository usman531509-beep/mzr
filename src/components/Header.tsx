"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import {
  ChevronDown, Heart, LayoutDashboard, LogOut, Phone,
  ShoppingBag, ShoppingCart, Truck, User as UserIcon,
} from "lucide-react";
import type { NavCategoryNode } from "@/lib/nav-cache";
import { SITE_PHONE, SITE_PHONE_TEL } from "@/lib/site";

type NavBrand = { id?: string; name: string; slug: string };
type NavProductBrand = { name: string; slug: string };
type NavModel = { id: string; name: string; brandId: string; yearStart: number; yearEnd: number };

// ---------------------------------------------------------------------------
// Storefront header.
// Desktop: standalone logo + floating rounded "pill" navbar (reference:
//   DataLens-style) — nav links with CSS-hover mega menus in the middle,
//   icon actions (search / wishlist / basket) + a single account CTA on the
//   right. The big inline search bar is replaced by the global SearchOverlay
//   (search icon or Cmd+K) so the pill stays slim.
// Mobile (<lg): compact header with centred click-to-call + large logo; all
//   other actions live in the bottom bar and slide-in menu.
// All data comes from the cached nav payload; cart, wishlist, session and
// search behaviour is unchanged.
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
  const pathname = usePathname();
  const items = useCart((s) => s.items);
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);
  const wishlistCount = useWishlist((s) => s.items.length);
  const openCart     = useOverlays((s) => s.openCart);
  const openWishlist = useOverlays((s) => s.openWishlist);

  const role = session?.user?.role;
  const hasAdminPanel = role === "ADMIN" || role === "MANAGER" || role === "STAFF";

  const displayName = session?.user?.name || session?.user?.email || "Account";
  const initial = displayName.trim()[0]?.toUpperCase() || "?";
  const firstName = displayName.split(/[\s@]/)[0];

  return (
    <>
      {/* ---------- Mobile header: click-to-call + large centred logo ------- */}
      <header className="h-header lg:hidden">
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
          <a href={`tel:${SITE_PHONE_TEL}`} className="h-phone-mobile" aria-label={`Call ${SITE_PHONE}`}>
            <Phone />
            {SITE_PHONE}
          </a>
        </div>
      </header>

      {/* ---------- Desktop header (transparent, sits over the hero bg) ------
          Row 1: big logo · full search input · account actions
          Row 2: sticky nav bar with mega menus */}
      <div className="h-float">
        {/* Logo OUTSIDE the box — larger, to the left. */}
        <Link href="/" className="h-float-logo" aria-label="MZR Spare home">
          <Image
            src="/logo.png"
            alt="MZR Spare — Motorbike Parts Specialist"
            width={617}
            height={405}
            priority
            className="h-[144px] w-auto"
          />
        </Link>

        <div className="h-float-box">
          <div className="h-float-main">
          {/* Full, typeable search with live autocomplete. */}
          <div className="h-float-search">
            <NavSearch />
          </div>

          <div className="h-float-actions">
            <button type="button" className="h-pill-icon" onClick={openWishlist} aria-label="Open wishlist">
              <Heart />
              {wishlistCount > 0 && <span className="h-badge">{wishlistCount > 99 ? "99" : wishlistCount}</span>}
            </button>
            <button type="button" className="h-pill-icon" onClick={openCart} aria-label="Open basket">
              <ShoppingCart />
              {cartCount > 0 && <span className="h-badge">{cartCount > 99 ? "99" : cartCount}</span>}
            </button>

            {session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="h-pill-user" aria-label="Account menu">
                    <span className="h-pill-avatar">{initial}</span>
                    <span className="h-pill-user-name">{firstName}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {hasAdminPanel ? `Signed in as ${role!.toLowerCase()}` : "Signed in"}
                    </span>
                    <span className="truncate text-sm font-medium normal-case">{displayName}</span>
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
              <Link href="/login" className="h-pill-cta">Login / Register</Link>
            )}
          </div>
        </div>

        {/* Sticky nav bar — links scroll under it while the logo/search row
            scrolls away. Mega panels anchor to this full-width pill. */}
        <div className="h-navwrap">
          <div className="h-pill h-navpill">
            <nav className="h-pill-nav" aria-label="Primary">
              <Link href="/" className={pathname === "/" ? "active" : undefined}>Home</Link>
              {tree.length > 0 && <CategoriesMega tree={tree} />}
              {brands.length > 0 && <BikesMega brands={brands} models={models} />}
              {productBrands.length > 0 && <BrandsMega productBrands={productBrands} />}
              <Link href="/products">All Products</Link>
            </nav>
            <Link href="/track" className="h-nav-track">
              <Truck className="h-[16px] w-[16px]" />
              Track order
            </Link>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Mega menus — markup mirrors the reference (.h-mega / .mp-side / .mp-pane).
// The panel opens on CLICK (JS `open` state), and closes on outside click or
// Escape. Inside the open panel, hovering a category row still previews its
// sub-categories in the right pane.
// ---------------------------------------------------------------------------

type PaneCol = { heading: string; headingHref?: string; items: { label: string; href: string }[] };

function Caret() {
  return (
    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// useLayoutEffect on the client (positions the panel before paint → no flash),
// but useEffect on the server to avoid React's SSR warning.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Gap between the mega panel and the viewport edges (≈6mm at 96dpi).
const MEGA_EDGE_GAP = 22;

function MegaShell({ label, rows }: { label: string; rows: { label: string; href: string; cols: PaneCol[]; promo?: React.ReactNode }[] }) {
  // JS-controlled open state instead of pure CSS :hover — a hover-only panel
  // vanishes mid-scroll: until the floating bar sticks, scrolling shifts it up
  // under the stationary pointer, the pointer slips off the trigger and
  // :hover/mouseleave close the panel. So:
  //   · mouseenter opens, mouseleave closes after a short grace delay
  //   · a leave that happens right after a scroll event is treated as
  //     scroll-induced: the panel stays open, and we only close on the next
  //     real mouse move that lands outside the mega.
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Break the panel out of the 1320px header container so it opens from ~6mm
  // off the viewport's left edge and spans nearly full width — the same on
  // every screen size. The panel is position:absolute vs. its nearest
  // positioned ancestor (the nav pill, which is offset by the logo and capped
  // at 1320px), so we translate the desired viewport gap into a left/width
  // relative to that ancestor. Vertical (top:100%) stays in CSS so it keeps
  // tracking the nav on scroll; only the horizontal needs recomputing, and
  // only on resize.
  useIsoLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const anchor = panel.offsetParent as HTMLElement | null;
      const anchorLeft = anchor ? anchor.getBoundingClientRect().left : 0;
      // clientWidth excludes the vertical scrollbar so the panel never causes a
      // horizontal overflow on pages that scroll.
      const vw = document.documentElement.clientWidth;
      panel.style.left = `${MEGA_EDGE_GAP - anchorLeft}px`;
      panel.style.right = "auto";
      panel.style.width = `${Math.max(0, vw - MEGA_EDGE_GAP * 2)}px`;
    };
    position();
    window.addEventListener("resize", position);
    return () => window.removeEventListener("resize", position);
  }, [open]);

  // Open on click; close on an outside click or the Escape key.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`h-mega${open ? " open" : ""}`}>
      <button
        type="button"
        className="h-mega-trigger"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label} <Caret />
      </button>
      {/* Clicking any link inside closes the panel immediately. */}
      <div ref={panelRef} className="h-mega-panel" onClick={() => setOpen(false)}>
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

  const rows = tree.map((top) => {
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
  const rows = brands.map((b) => {
    const own = models.filter((m) => m.brandId === b.id);
    // Fill a full column top-to-bottom before wrapping to the next one — the
    // panel is tall, so a small chunk (e.g. 6) wrapped far too early and left
    // most of the vertical space empty. ~16 fills the column height first.
    const chunks = chunkInto(own, 16);
    const cols: PaneCol[] =
      chunks.length > 0
        ? chunks.map((chunk, i) => ({
            heading: i === 0 ? `${b.name} models` : "",
            items: chunk.map((m) => ({
              // Include the fitment year range so same-named variants (e.g. two
              // "PCX 125" rows for different years) are distinguishable.
              label:
                m.yearStart === m.yearEnd
                  ? `${m.name} (${m.yearStart})`
                  : `${m.name} (${m.yearStart}–${m.yearEnd})`,
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

  const rows = groups.map((group) => {
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
