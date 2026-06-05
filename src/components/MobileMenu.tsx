"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Briefcase, ChevronRight, MapPin, Package, Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { NavCategoryNode } from "@/lib/nav-cache";

// Storefront nav links that exist on the desktop navbar but don't fit
// into the shortcuts-grid format (which is just Best deals / New in).
// Surfaced here so mobile users have parity with the desktop header.
const NAV_LINKS: Array<{ Icon: LucideIcon; label: string; href: string }> = [
  { Icon: Package,   label: "All products", href: "/products" },
  { Icon: Sparkles,  label: "New in",       href: "/products?sort=new" },
  { Icon: MapPin,    label: "Track order",  href: "/track" },
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

  // Search flattens the entire tree (every depth) so a customer can jump
  // straight to a deeply-nested category by typing part of its name.
  const flat = flattenTree(tree);
  const matches = q
    ? flat.filter((n) => n.name.toLowerCase().includes(q.toLowerCase()))
    : [];

  return (
    <div
      className={`fixed inset-0 z-[9000] overflow-y-auto bg-ink transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      } lg:hidden`}
      aria-hidden={!open}
    >
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-ink px-5 py-3">
        <div className="relative flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search categories…"
            className="w-full rounded-lg border border-white/10 bg-ink-700 px-3.5 py-2.5 pr-9 text-[15px] text-white placeholder:text-white/40 outline-none focus:border-red"
          />
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <button
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-700 text-white/85 transition hover:bg-red hover:text-white"
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
              <div className="px-1 py-6 text-center text-sm text-white/50">
                No categories match &quot;{q}&quot;.
              </div>
            ) : (
              matches.map((n) => (
                <Link
                  key={n.id}
                  href={`/products?category=${n.path}`}
                  onClick={onClose}
                  className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-ink-800 px-4 py-3 transition hover:border-red hover:bg-ink-700"
                >
                  <span className="font-head text-[15px] font-bold uppercase tracking-wide text-white">
                    {n.name}
                  </span>
                  <span className="truncate font-mono text-[11px] text-white/40">
                    /{n.path}
                  </span>
                </Link>
              ))
            )}
          </div>
        ) : (
          <>
            {shortcuts.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {shortcuts.map((s) => (
                  <Link
                    key={s.label}
                    href={s.href}
                    onClick={onClose}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-ink-800 px-3.5 py-3 font-head text-sm font-bold uppercase tracking-wider text-white/85 transition hover:border-red hover:text-white"
                  >
                    <span className="text-lg">{s.icon}</span> {s.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Storefront nav links — mirrors the desktop top-nav so a
                mobile customer can jump straight to all products, track
                an order, or open a trade account without hunting. */}
            <div className="mb-4 overflow-hidden rounded-lg border border-white/10 bg-ink-800/40">
              {NAV_LINKS.map(({ Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={onClose}
                  className="flex items-center gap-3 border-b border-white/5 px-4 py-3 text-white/85 transition last:border-b-0 hover:bg-ink-700 hover:text-white"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-ink-700 text-red">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-head text-[14px] font-bold uppercase tracking-wide">
                    {label}
                  </span>
                  <ChevronRight className="ml-auto h-4 w-4 text-white/40" />
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
              <CollapsibleSection title="By bike brands" icon="🏍️">
                <ul className="space-y-0.5 pl-3">
                  {brands.map((b) => (
                    <li key={b.slug}>
                      <Link
                        href={`/products?brand=${b.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-2 py-2.5 text-[15px] text-white/75 transition hover:translate-x-1 hover:text-white"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                        {b.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}

            {/* Part-manufacturer group — Brembo, NGK, EBC, etc. */}
            {productBrands.length > 0 && (
              <CollapsibleSection title="By parts brands" icon="🛠️">
                <ul className="space-y-0.5 pl-3">
                  {productBrands.map((b) => (
                    <li key={b.slug}>
                      <Link
                        href={`/products?productBrand=${b.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-2 py-2.5 text-[15px] text-white/75 transition hover:translate-x-1 hover:text-white"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
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
    <li className={isTop ? "border-b border-white/10" : ""}>
      <div className="flex items-stretch">
        <Link
          href={`/products?category=${node.path}`}
          onClick={onNavigate}
          className={
            isTop
              ? "flex flex-1 items-center gap-2.5 py-4 text-white"
              : "flex flex-1 items-center gap-2 py-3 text-white/75 transition hover:translate-x-1 hover:text-white"
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
              <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
              <span className="text-[15px]">{node.name}</span>
            </>
          )}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex w-12 shrink-0 items-center justify-center text-white/55 transition hover:text-white"
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

function CollapsibleSection({
  title, icon, children,
}: { title: string; icon: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4"
      >
        <span className="flex items-center gap-2.5">
          <span className="w-7 text-center text-lg">{icon}</span>
          <span className="font-head text-[18px] font-extrabold uppercase tracking-wide text-white">
            {title}
          </span>
        </span>
        <ChevronRight
          className={`h-4 w-4 text-white/55 transition-transform ${open ? "rotate-90" : ""}`}
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
