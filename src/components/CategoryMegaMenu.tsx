"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavCategoryNode } from "@/lib/nav-cache";

// Habitat / IKEA-style two-pane mega menu for the Parts dropdown.
//
//   ┌─────────────────┬────────────────────────────────────────────┐
//   │ BRAKES          │  Shop all Brakes →                         │
//   │ ELECTRICAL ▶    │                                            │
//   │ ENGINE          │  BEDROOM        FURNISHINGS    KITCHEN     │
//   │ ...             │  - Beds         - Curtains    - Cookware   │
//   └─────────────────┴────────────────────────────────────────────┘
//
// Left pane lists the depth-0 categories. Hovering/focusing one swaps the
// right pane to that category's sub-tree:
//   - Each depth-1 child becomes a section header (also linked).
//   - The depth-2 leaves under each section become the link list.
// Categories without any children render as a single "Browse X" entry.
export function CategoryMegaMenu({ tree }: { tree: NavCategoryNode[] }) {
  const [activeId, setActiveId] = useState<string>(tree[0]?.id ?? "");
  const active = tree.find((n) => n.id === activeId) ?? tree[0];
  if (!active) return null;

  return (
    <div
      className="mega absolute left-0 top-full z-40 mt-2 w-[1080px] max-w-[calc(100vw-2rem)] origin-top overflow-hidden rounded-xl border border-white/10 bg-ink-800
                 shadow-[0_24px_60px_-10px_rgba(0,0,0,0.7),0_0_0_1px_rgba(232,21,27,0.15)]"
    >
      {/* Brand accent strip + faint inner glow — matches MegaMenu's look. */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-red to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(232,21,27,0.08),transparent_55%)]" />

      <div className="relative grid min-h-[420px] grid-cols-[240px_1fr]">
        {/* LEFT — top-level categories */}
        <div className="border-r border-white/10 bg-ink-900/40 py-3">
          {tree.map((root) => {
            const isActive = activeId === root.id;
            return (
              <button
                key={root.id}
                type="button"
                onMouseEnter={() => setActiveId(root.id)}
                onFocus={() => setActiveId(root.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 border-l-2 px-5 py-3.5 text-left text-[16px] transition",
                  isActive
                    ? "border-red bg-red/[0.08] font-semibold text-white"
                    : "border-transparent text-white/70 hover:bg-white/[0.03] hover:text-white",
                )}
              >
                <span className="truncate uppercase tracking-wide">{root.name}</span>
                <ChevronRight className={cn("h-4 w-4 shrink-0 transition", isActive ? "text-red" : "opacity-40")} />
              </button>
            );
          })}
        </div>

        {/* RIGHT — selected category's sub-tree */}
        <div className="p-6">
          {/* Top "Shop all" link — drills straight into /products with the
              parent path so customers who want everything skip past the
              section drill-down. */}
          <Link
            href={`/products?category=${active.path}`}
            className="mb-5 inline-flex items-center gap-2 border-b border-red/30 pb-2 font-head text-lg font-bold uppercase tracking-wider text-white transition hover:text-red"
          >
            Shop all {active.name}
            <ArrowRight className="h-5 w-5" />
          </Link>

          {active.children.length === 0 ? (
            // Top-level with no sub-categories — nothing more to drill into.
            <p className="text-sm text-white/60">
              No sub-categories yet. Use the link above to browse {active.name}.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-3 xl:grid-cols-4">
              {active.children.map((section) => (
                <div key={section.id} className="min-w-0">
                  <Link
                    href={`/products?category=${section.path}`}
                    className="mb-2.5 block border-b border-red/20 pb-2 font-head text-[15px] font-bold uppercase tracking-[0.14em] text-red transition hover:text-white"
                  >
                    {section.name}
                  </Link>
                  <ul className="space-y-0.5">
                    {section.children.length > 0 ? (
                      section.children.map((leaf) => (
                        <li key={leaf.id}>
                          <Link
                            href={`/products?category=${leaf.path}`}
                            className="group/link flex items-center gap-2 rounded px-2 py-1.5 text-[15px] text-white/75 transition hover:bg-white/[0.04] hover:text-white"
                          >
                            <span className="text-red opacity-0 transition group-hover/link:opacity-100">›</span>
                            <span className="-ml-2 truncate transition group-hover/link:ml-0">{leaf.name}</span>
                          </Link>
                        </li>
                      ))
                    ) : (
                      // Section itself is a leaf — render a single "Browse"
                      // entry so the column doesn't sit empty under its
                      // header.
                      <li>
                        <Link
                          href={`/products?category=${section.path}`}
                          className="block rounded px-2 py-1.5 text-[15px] text-white/75 transition hover:text-white"
                        >
                          Browse {section.name}
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
