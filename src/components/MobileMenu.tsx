"use client";

import { useState } from "react";
import Link from "next/link";

type Group = { icon: string; title: string; items: { label: string; href: string }[] };

export function MobileMenu({
  open,
  onClose,
  groups,
}: {
  open: boolean;
  onClose: () => void;
  groups: Group[];
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [q, setQ] = useState("");

  const filtered = q
    ? groups
        .map((g) => ({
          ...g,
          items: g.items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())),
        }))
        .filter((g) => g.items.length || g.title.toLowerCase().includes(q.toLowerCase()))
    : groups;

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
            className="w-full rounded-lg border border-white/10 bg-ink-700 px-3.5 py-2 pr-9 text-sm text-white placeholder:text-white/40 outline-none focus:border-red"
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
        <div className="grid grid-cols-2 gap-2 pb-2">
          <Link href="/products" onClick={onClose} className="flex items-center gap-2 rounded-lg border border-white/10 bg-ink-800 px-3.5 py-3 font-head text-sm font-bold uppercase tracking-wider text-white/85 transition hover:border-red hover:text-white">
            <span className="text-lg">🔥</span> Best deals
          </Link>
          <Link href="/products?sort=new" onClick={onClose} className="flex items-center gap-2 rounded-lg border border-white/10 bg-ink-800 px-3.5 py-3 font-head text-sm font-bold uppercase tracking-wider text-white/85 transition hover:border-red hover:text-white">
            <span className="text-lg">✨</span> New in
          </Link>
        </div>

        {filtered.map((g, idx) => (
          <div key={g.title} className="border-b border-white/10">
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="flex w-full items-center justify-between py-3.5"
            >
              <span className="flex items-center gap-2.5">
                <span className="w-7 text-center text-lg">{g.icon}</span>
                <span className="font-head text-base font-extrabold uppercase tracking-wide text-white">{g.title}</span>
              </span>
              <span className={`text-xs text-white/40 transition ${openIdx === idx ? "rotate-180" : ""}`}>▼</span>
            </button>
            {openIdx === idx && (
              <ul className="pb-3 pl-9">
                {g.items.map((it) => (
                  <li key={it.label}>
                    <Link
                      href={it.href}
                      onClick={onClose}
                      className="flex items-center gap-2 border-b border-white/5 py-1.5 text-[13.5px] text-white/65 transition hover:translate-x-1 hover:text-white"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-ink-600" /> {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
