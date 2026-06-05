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
type ProductBrand = { id: string; name: string; slug: string };
type Model = { id: string; name: string; brandId: string; yearStart: number; yearEnd: number };

// Renders the three overlay-style UIs in one place, driven by the global
// store. Header (desktop) and MobileBottomBar both dispatch open events
// against the same store, so a single instance of each overlay is enough.

export function GlobalOverlays({
  brands, productBrands = [], models, tree = [],
}: {
  brands: Brand[];
  productBrands?: ProductBrand[];
  models: Model[];
  tree?: NavCategoryNode[];
}) {
  // Shortcuts shown above the category tree in the mobile menu.
  const shortcuts = [
    { icon: "🔥", label: "Best deals", href: "/products" },
    { icon: "✨", label: "New in",     href: "/products?sort=new" },
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
      <MobileMenu
        open={menuOpen}
        onClose={closeMenu}
        tree={tree}
        brands={brands.map((b) => ({ name: b.name, slug: b.slug }))}
        productBrands={productBrands.map((b) => ({ name: b.name, slug: b.slug }))}
        shortcuts={shortcuts}
      />
      <FinderSheet   open={finderOpen} onClose={closeFinder} brands={brands} models={models} />
      {/* Cart + wishlist sheets read their own open state from the store. */}
      <CartSheet />
      <WishlistSheet />
    </>
  );
}
