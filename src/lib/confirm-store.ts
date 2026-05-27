"use client";

import { create } from "zustand";

// Global promise-based confirm dialog. Components call `await confirm({...})`
// and the singleton dialog (mounted once in the root layout) resolves the
// promise with true/false. Drop-in replacement for window.confirm() that
// matches the site's dark theme and works on mobile.

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // Tints the confirm button red. Use for any destructive action so the
  // button colour makes the consequence obvious.
  destructive?: boolean;
};

type State = {
  open: boolean;
  options: ConfirmOptions | null;
  resolver: ((v: boolean) => void) | null;
  ask: (opts: ConfirmOptions) => Promise<boolean>;
  resolve: (v: boolean) => void;
};

export const useConfirmStore = create<State>((set, get) => ({
  open: false,
  options: null,
  resolver: null,
  ask: (opts) =>
    new Promise<boolean>((res) => {
      // If a previous prompt is still hanging around (e.g. component
      // unmounted before resolve), resolve it false first so the singleton
      // doesn't leak.
      const prev = get().resolver;
      if (prev) prev(false);
      set({ open: true, options: opts, resolver: res });
    }),
  resolve: (v) => {
    const r = get().resolver;
    set({ open: false, options: null, resolver: null });
    if (r) r(v);
  },
}));

// Convenience function so call sites don't have to read the store directly.
export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().ask(opts);
}
