"use client";
import { create } from "zustand";

// Global UI state for the modal-style overlays so any component
// (header, mobile bottom bar, anywhere) can open them by dispatching here.

type Overlays = {
  searchOpen: boolean;
  menuOpen: boolean;
  finderOpen: boolean;
  cartOpen: boolean;
  wishlistOpen: boolean;
  openSearch: () => void;
  openMenu: () => void;
  openFinder: () => void;
  openCart: () => void;
  openWishlist: () => void;
  closeSearch: () => void;
  closeMenu: () => void;
  closeFinder: () => void;
  closeCart: () => void;
  closeWishlist: () => void;
  closeAll: () => void;
};

const allClosed = {
  searchOpen: false, menuOpen: false, finderOpen: false,
  cartOpen: false, wishlistOpen: false,
};

export const useOverlays = create<Overlays>((set) => ({
  ...allClosed,
  openSearch:   () => set({ ...allClosed, searchOpen: true }),
  openMenu:     () => set({ ...allClosed, menuOpen: true }),
  openFinder:   () => set({ ...allClosed, finderOpen: true }),
  openCart:     () => set({ ...allClosed, cartOpen: true }),
  openWishlist: () => set({ ...allClosed, wishlistOpen: true }),
  closeSearch:   () => set({ searchOpen: false }),
  closeMenu:     () => set({ menuOpen: false }),
  closeFinder:   () => set({ finderOpen: false }),
  closeCart:     () => set({ cartOpen: false }),
  closeWishlist: () => set({ wishlistOpen: false }),
  closeAll:      () => set(allClosed),
}));
