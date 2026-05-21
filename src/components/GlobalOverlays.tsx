"use client";

import { useEffect } from "react";
import { useOverlays } from "@/lib/overlays-store";
import { SearchOverlay } from "@/components/SearchOverlay";
import { MobileMenu } from "@/components/MobileMenu";
import { FinderSheet } from "@/components/FinderSheet";
import { CartSheet } from "@/components/CartSheet";
import { WishlistSheet } from "@/components/WishlistSheet";
import type { NavCategoryNode } from "@/lib/nav-cache";

type Brand = { id: string; name: string; slug: string };
type Model = { id: string; name: string; brandId: string; yearStart: number; yearEnd: number };

// Renders the three overlay-style UIs in one place, driven by the global
// store. Header (desktop) and MobileBottomBar both dispatch open events
// against the same store, so a single instance of each overlay is enough.

export function GlobalOverlays({
  brands, models, tree = [],
}: {
  brands: Brand[];
  models: Model[];
  tree?: NavCategoryNode[];
}) {
  // Build the mobile menu groups from the catalogue tree: each top-level
  // category is one group; its direct children become the items so customers
  // can drill into sub-categories without opening every page in turn. Empty
  // branches are hidden.
  const mobileGroups = [
    ...tree
      .filter((c) => c.productCount > 0)
      .map((c) => ({
        icon: "📦",
        title: c.name,
        items: c.children.length > 0
          ? c.children
              .filter((sub) => sub.productCount > 0)
              .map((sub) => ({ label: sub.name, href: `/category/${sub.path}` }))
          : [{ label: `Browse ${c.name}`, href: `/category/${c.path}` }],
      })),
    ...(brands.length > 0
      ? [{
          icon: "🏷️",
          title: "Brands",
          items: brands.map((b) => ({ label: b.name, href: `/products?brand=${b.slug}` })),
        }]
      : []),
  ];
  const {
    searchOpen, menuOpen, finderOpen,
    openSearch, closeSearch, closeMenu, closeFinder,
  } = useOverlays();

  // Cmd/Ctrl + K opens the search overlay from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  return (
    <>
      <SearchOverlay open={searchOpen} onClose={closeSearch} />
      <MobileMenu    open={menuOpen}   onClose={closeMenu}   groups={mobileGroups} />
      <FinderSheet   open={finderOpen} onClose={closeFinder} brands={brands} models={models} />
      {/* Cart + wishlist sheets read their own open state from the store. */}
      <CartSheet />
      <WishlistSheet />
    </>
  );
}
