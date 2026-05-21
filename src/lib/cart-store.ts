"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  stock: number;
};

type State = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
};

const GUEST_KEY = "mzr-cart:guest";

export const useCart = create<State>()(
  persist(
    (set) => ({
      items: [],
      add: (item, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.productId === item.productId);
          if (existing) {
            const next = Math.min(existing.stock, existing.quantity + qty);
            return {
              items: s.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: next } : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, quantity: Math.min(qty, item.stock) }] };
        }),
      remove: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      setQty: (productId, qty) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.productId === productId
              ? { ...i, quantity: Math.max(1, Math.min(i.stock, qty)) }
              : i,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: GUEST_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Switch the persisted storage namespace to a user-scoped key (or back to
// guest on sign-out). Each user/admin keeps their own cart on this browser.
//
// When a user signs in, we also fetch their server-side cart and merge it
// with whatever's in the local cart (sum quantities, capped at stock), then
// push the merged result back so the cart follows them across devices.
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let currentUserId: string | null = null;
let suspendSync = false;

export async function scopeCartToUser(userId: string | null) {
  currentUserId = userId;
  const name = userId ? `mzr-cart:${userId}` : GUEST_KEY;
  const persistApi = useCart.persist;
  if (!persistApi) return;

  if (persistApi.getOptions().name !== name) {
    persistApi.setOptions({ name });
    useCart.setState({ items: [] });
    await persistApi.rehydrate();
  }

  if (!userId) return;

  // Fetch the server cart and merge into the local cart.
  try {
    const res = await fetch("/api/cart", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { items: CartItem[] };
    const serverItems = data.items ?? [];
    const local = useCart.getState().items;
    const merged = mergeCarts(local, serverItems);
    suspendSync = true;
    useCart.setState({ items: merged });
    suspendSync = false;
    // Push merged back so other devices see the same state.
    void pushToServer(merged);
  } catch {
    /* offline / network — keep local cart */
  }
}

function mergeCarts(a: CartItem[], b: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const it of a) map.set(it.productId, { ...it });
  for (const it of b) {
    const existing = map.get(it.productId);
    if (existing) {
      const cap = it.stock || existing.stock;
      existing.quantity = Math.min(cap, existing.quantity + it.quantity);
      // Prefer server-side authoritative product fields.
      existing.name = it.name;
      existing.price = it.price;
      existing.image = it.image ?? existing.image;
      existing.stock = it.stock;
    } else {
      map.set(it.productId, { ...it });
    }
  }
  return Array.from(map.values());
}

async function pushToServer(items: CartItem[]) {
  try {
    await fetch("/api/cart", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      }),
    });
  } catch {
    /* swallow — local cart is still authoritative until next sync */
  }
}

// Debounced subscription: any cart change while signed-in syncs to server.
useCart.subscribe((state) => {
  if (suspendSync || !currentUserId) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => pushToServer(state.items), 400);
});

export const cartTotals = (items: CartItem[]) => {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = items.length === 0 ? 0 : subtotal > 200 ? 0 : 9.99;
  // VAT (20%) is charged on the gross sale — i.e. goods + shipping. The
  // `tax` key is kept for backwards compatibility with existing consumers.
  const tax = +((subtotal + shipping) * 0.20).toFixed(2);
  const total = +(subtotal + shipping + tax).toFixed(2);
  return { subtotal, shipping, tax, total };
};
