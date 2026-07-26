"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Briefcase, ChevronRight, Heart, Package, ShoppingBag, Sparkles, Truck, User,
  type LucideIcon,
} from "lucide-react";
import type { NavCategoryNode } from "@/lib/nav-cache";
import { useOverlays } from "@/lib/overlays-store";
import { useCart } from "@/lib/cart-store";
import { useWishlist } from "@/lib/wishlist-store";

// Storefront nav links that exist on the desktop navbar but don't fit
// into the shortcuts-grid format (which is just Best deals / New in).
// Surfaced here so mobile users have parity with the desktop header.
const NAV_LINKS: Array<{ Icon: LucideIcon; label: string; href: string }> = [
  { Icon: Package,   label: "All products", href: "/products" },
  { Icon: Sparkles,  label: "New in",       href: "/products?sort=new" },
  { Icon: Briefcase, label: "Trade account", href: "/trade-account" },
];

// Fixed action shortcuts that always sit above the category list.
type Shortcut = { icon: string; label: string; href: string };

type BrandsGroup = {
  brands: Array<{ name: string; slug: string }>;
};

export function MobileMenu({
  open,
  onClose,
  tree = [],
  brands = [],
  productBrands = [],
  shortcuts = [],
}: {
  open: boolean;
  onClose: () => void;
  tree?: NavCategoryNode[];
  brands?: BrandsGroup["brands"];
  productBrands?: BrandsGroup["brands"];
  shortcuts?: Shortcut[];
}) {
  const [q, setQ] = useState("");

  // The header's action icons (Track / Account / Wishlist / Basket) are hidden
  // on mobile and surfaced here instead, so the slide-in menu is the single
  // home for those shortcuts alongside the bottom bar.
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isStaff = role === "ADMIN" || role === "MANAGER" || role === "STAFF";
  const accountHref = session?.user ? (isStaff ? "/admin" : "/account") : "/login";
  const accountLabel = session?.user ? (isStaff ? "Admin" : "Account") : "Sign in";
  const openCart = useOverlays((s) => s.openCart);
  const openWishlist = useOverlays((s) => s.openWishlist);
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const wishlistCount = useWishlist((s) => s.items.length);

  // Search flattens the entire tree (every depth) so a customer can jump
  // straight to a deeply-nested category by typing part of its name.
  const flat = flattenTree(tree);
  const matches = q
    ? flat.filter((n) => n.name.toLowerCase().includes(q.toLowerCase()))
    : [];

  return (
    <div
      className={`fixed inset-0 z-[9000] overflow-y-auto bg-white transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      } lg:hidden`}
      aria-hidden={!open}
    >
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-white px-5 py-3">
        <div className="relative flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search categories…"
            className="w-full rounded-lg border border-line bg-soft px-3.5 py-2.5 pr-9 text-[15px] text-ink placeholder:text-muted-foreground outline-none focus:border-red focus:bg-white"
          />
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <button
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft text-ink transition hover:bg-red hover:text-white"
          aria-label="Close menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="px-5 pb-20 pt-4">
        {/* Search results take over the body when active — flat list of every
            matching category at any depth, showing the path for context. */}
        {q ? (
          <div className="space-y-1">
            {matches.length === 0 ? (
              <div className="px-1 py-6 text-center text-sm text-muted-foreground">
                No categories match &quot;{q}&quot;.
              </div>
            ) : (
              matches.map((n) => (
                <Link
                  key={n.id}
                  href={`/products?category=${n.path}`}
                  onClick={onClose}
                  className="flex items-center justify-between gap-3 rounded-md border border-line bg-white px-4 py-3 transition hover:border-red hover:bg-soft"
                >
                  <span className="font-head text-[15px] font-bold uppercase tracking-wide text-ink">
                    {n.name}
                  </span>
                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                    /{n.path}
                  </span>
                </Link>
              ))
            )}
          </div>
        ) : (
          <>
            {/* Quick actions — the header's Track / Account / Wishlist / Basket
                icons live here on mobile. Wishlist/Basket open their sheets;
                the overlay store auto-closes this menu when they do. */}
            <div className="mb-4 grid grid-cols-4 gap-2">
              <ActionTile href={accountHref} icon={User} label={accountLabel} onClick={onClose} />
              <ActionTile icon={Heart} label="Wishlist" badge={wishlistCount} onClick={openWishlist} />
              <ActionTile href="/track" icon={Truck} label="Track" onClick={onClose} />
              <ActionTile icon={ShoppingBag} label="Basket" badge={cartCount} onClick={openCart} />
            </div>

            {shortcuts.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {shortcuts.map((s) => (
                  <Link
                    key={s.label}
                    href={s.href}
                    onClick={onClose}
                    className="flex items-center gap-2 rounded-lg border border-line bg-soft px-3.5 py-3 font-head text-sm font-bold uppercase tracking-wider text-ink transition hover:border-red hover:text-red"
                  >
                    <span className="text-lg">{s.icon}</span> {s.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Storefront nav links — mirrors the desktop top-nav so a
                mobile customer can jump straight to all products, track
                an order, or open a trade account without hunting. */}
            <div className="mb-4 overflow-hidden rounded-lg border border-line bg-white">
              {NAV_LINKS.map(({ Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={onClose}
                  className="flex items-center gap-3 border-b border-line/70 px-4 py-3 text-ink transition last:border-b-0 hover:bg-soft hover:text-red"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-soft text-red">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-head text-[14px] font-bold uppercase tracking-wide">
                    {label}
                  </span>
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>

            {/* Top-level categories — each row expandable into its tree.
                Show every category the admin has created, even with zero
                products, so the structure matches the desktop sidebar. */}
            <ul>
              {tree.map((root) => (
                <CategoryRow
                  key={root.id}
                  node={root}
                  depth={0}
                  onNavigate={onClose}
                />
              ))}
            </ul>

            {/* Bike-brand group — Honda, Yamaha, etc. */}
            {brands.length > 0 && (
              <CollapsibleSection title="By bike" icon="🏍️">
                <ul className="space-y-0.5 pl-3">
                  {brands.map((b) => (
                    <li key={b.slug}>
                      <Link
                        href={`/products?brand=${b.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-2 py-2.5 text-[15px] text-ink/75 transition hover:translate-x-1 hover:text-red"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-ink/20" />
                        {b.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}

            {/* Part-manufacturer group — Brembo, NGK, EBC, etc. */}
            {productBrands.length > 0 && (
              <CollapsibleSection title="By brand" icon="🛠️">
                <ul className="space-y-0.5 pl-3">
                  {productBrands.map((b) => (
                    <li key={b.slug}>
                      <Link
                        href={`/products?productBrand=${b.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-2 py-2.5 text-[15px] text-ink/75 transition hover:translate-x-1 hover:text-red"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-ink/20" />
                        {b.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Recursive category row. Top-level rows render with the big "category"
// styling; deeper rows render lighter. Anywhere there are children, an
// expand chevron toggles the nested list. Tapping the name always navigates
// to that category page (so a parent is reachable too, not just its leaves).
function CategoryRow({
  node, depth, onNavigate,
}: {
  node: NavCategoryNode;
  depth: number;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  const isTop = depth === 0;

  return (
    <li className={isTop ? "border-b border-line" : ""}>
      <div className="flex items-stretch">
        <Link
          href={`/products?category=${node.path}`}
          onClick={onNavigate}
          className={
            isTop
              ? "flex flex-1 items-center gap-2.5 py-4 text-ink"
              : "flex flex-1 items-center gap-2 py-3 text-ink/75 transition hover:translate-x-1 hover:text-red"
          }
          style={{ paddingLeft: depth * 16 }}
        >
          {isTop ? (
            <>
              <span className="w-7 text-center text-lg">📦</span>
              <span className="font-head text-[18px] font-extrabold uppercase tracking-wide">
                {node.name}
              </span>
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-ink/20" />
              <span className="text-[15px]">{node.name}</span>
            </>
          )}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex w-12 shrink-0 items-center justify-center text-muted-foreground transition hover:text-red"
            aria-label={open ? "Collapse" : "Expand"}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
            />
          </button>
        )}
      </div>
      {hasChildren && open && (
        <ul className="pb-1">
          {node.children.map((child) => (
            <CategoryRow
              key={child.id}
              node={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// One tile in the mobile quick-actions row. Renders as a Link (Account,
// Track) or a button (Wishlist, Basket — they open overlay sheets), with an
// optional count badge on the icon.
function ActionTile({
  href, icon: Icon, label, badge, onClick,
}: {
  href?: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-soft text-red">
        <Icon className="h-4 w-4" />
        {!!badge && badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red px-1 text-[9px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className="text-[11px] font-semibold text-ink">{label}</span>
    </>
  );
  const cls =
    "flex flex-col items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-3 text-center transition hover:border-red hover:text-red";
  return href ? (
    <Link href={href} onClick={onClick} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{inner}</button>
  );
}

function CollapsibleSection({
  title, icon, children,
}: { title: string; icon: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4"
      >
        <span className="flex items-center gap-2.5">
          <span className="w-7 text-center text-lg">{icon}</span>
          <span className="font-head text-[18px] font-extrabold uppercase tracking-wide text-ink">
            {title}
          </span>
        </span>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

function flattenTree(tree: NavCategoryNode[]): NavCategoryNode[] {
  const out: NavCategoryNode[] = [];
  const walk = (ns: NavCategoryNode[]) => {
    for (const n of ns) {
      out.push(n);
      if (n.children.length) walk(n.children);
    }
  };
  walk(tree);
  return out;
}
