"use client";

import { useEffect } from "react";
import { useOverlays } from "@/lib/overlays-store";
import { SearchOverlay } from "@/components/SearchOverlay";
import { MobileMenu } from "@/components/MobileMenu";
import { FinderSheet } from "@/components/FinderSheet";
import { CartSheet } from "@/components/CartSheet";
import { WishlistSheet } from "@/components/WishlistSheet";

type Brand = { id: string; name: string; slug: string };
type Model = { id: string; name: string; brandId: string; yearStart: number; yearEnd: number };
type Category = { name: string; slug: string; count: number };

// Renders the three overlay-style UIs in one place, driven by the global
// store. Header (desktop) and MobileBottomBar both dispatch open events
// against the same store, so a single instance of each overlay is enough.

export function GlobalOverlays({
  brands, models, categories = [],
}: {
  brands: Brand[];
  models: Model[];
  categories?: Category[];
}) {
  // Build the mobile menu groups from the live catalogue: one group per
  // category that has products, plus a "Brands" group at the bottom. Each
  // category links to /products?category=<slug>.
  const mobileGroups = [
    ...(categories
      .filter((c) => c.count > 0)
      .map((c) => ({
        icon: "📦",
        title: c.name,
        items: [
          { label: `Browse ${c.name}`, href: `/products?category=${c.slug}` },
        ],
      }))),
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
