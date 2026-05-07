"use client";
import { create } from "zustand";

export type WishlistItem = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  image?: string | null;
  brand?: string | null;
  addedAt?: string;
};

type State = {
  items: WishlistItem[];
  loaded: boolean;
  isAuthed: boolean;
  load: () => Promise<void>;
  add: (item: WishlistItem) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  has: (productId: string) => boolean;
  clear: () => void;
};

export const useWishlist = create<State>((set, get) => ({
  items: [],
  loaded: false,
  isAuthed: false,

  load: async () => {
    try {
      const r = await fetch("/api/wishlist", { cache: "no-store" });
      if (r.status === 401) {
        set({ items: [], loaded: true, isAuthed: false });
        return;
      }
      const data = await r.json();
      set({ items: data.items ?? [], loaded: true, isAuthed: true });
    } catch {
      set({ loaded: true });
    }
  },

  add: async (item) => {
    const exists = get().items.some((i) => i.productId === item.productId);
    if (exists) return;
    // Optimistic add.
    set({ items: [{ ...item, addedAt: new Date().toISOString() }, ...get().items] });
    try {
      const r = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: item.productId }),
      });
      if (!r.ok) {
        // Roll back if the server rejected.
        set({ items: get().items.filter((i) => i.productId !== item.productId) });
        if (r.status === 401) set({ isAuthed: false });
      }
    } catch {
      set({ items: get().items.filter((i) => i.productId !== item.productId) });
    }
  },

  remove: async (productId) => {
    const prev = get().items;
    set({ items: prev.filter((i) => i.productId !== productId) });
    try {
      const r = await fetch(`/api/wishlist?productId=${encodeURIComponent(productId)}`, {
        method: "DELETE",
      });
      if (!r.ok) set({ items: prev });
    } catch {
      set({ items: prev });
    }
  },

  has: (productId) => get().items.some((i) => i.productId === productId),

  clear: () => set({ items: [], loaded: false, isAuthed: false }),
}));
