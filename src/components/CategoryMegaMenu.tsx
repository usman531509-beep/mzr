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
    // Locked to a single sensible width that always fits inside the
    // viewport (max-w-[calc(100vw-2rem)] is the hard cap). Width does NOT
    // grow with section count anymore — instead the grid below uses a
    // fixed column count with `minmax(0, 1fr)`, so columns share width
    // equally and extras wrap onto a new row. Combined with the
    // internal vertical scroll on the right pane, no content can ever
    // escape the dropdown boundary or the viewport.
    <div
      className={cn(
        "mega absolute left-0 top-full z-40 mt-2 w-[1080px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] origin-top overflow-hidden rounded-xl border border-white/10 bg-ink-800",
        "shadow-[0_24px_60px_-10px_rgba(0,0,0,0.7),0_0_0_1px_rgba(232,21,27,0.15)]",
      )}
    >
      {/* Brand accent strip + faint inner glow — matches MegaMenu's look. */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-red to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(232,21,27,0.08),transparent_55%)]" />

      <div className="relative grid max-h-[calc(100vh-6rem)] min-h-[420px] grid-cols-[240px_1fr]">
        {/* LEFT — top-level categories. Scrolls within itself when the
            admin has many top-level entries. `min-h-0` is the crucial
            bit: grid items default to min-content sizing, which beats
            the parent's max-height and disables overflow scrolling.
            Forcing min-h-0 lets the parent's height cap actually clip
            the child so the scroll engages. Same trick on the right
            pane below. */}
        <div className="min-h-0 overflow-y-auto border-r border-white/10 bg-ink-900/40 py-3">
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

        {/* RIGHT — selected category's sub-tree. Internally scrollable so
            very deep categories don't push the dropdown past the viewport
            edge. `min-h-0` + `min-w-0` are both required: without min-w-0,
            long category names (e.g. "STARTER SWITCH (UNDER BRAKE LEVER)")
            push the grid wider than its parent and the columns spill past
            the right edge. `overflow-x: hidden` is the belt-and-braces
            backstop in case something still forces a wider min-content. */}
        <div className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-6">
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
            // CSS multi-column layout (newspaper-style) instead of grid.
            // Sections flow top→bottom inside each column and pack
            // tightly without waiting for the tallest sibling in a row,
            // matching the Habitat/IKEA reference you shared. Adding
            // more sections just grows the columns longer; if they
            // exceed the viewport height, the right pane scrolls
            // internally. Column count scales with viewport width.
            <div
              className="columns-2 gap-x-6 sm:columns-3 lg:columns-4 xl:columns-5 [&>div]:mb-5"
            >
              {active.children.map((section) => (
                <div
                  key={section.id}
                  // `break-inside-avoid` keeps each section's heading +
                  // leaves together — they never get split across two
                  // columns mid-list.
                  className="break-inside-avoid"
                >
                  {/* `break-words` lets the section heading wrap inside
                      long names like "STARTER SWITCH (UNDER BRAKE
                      LEVER)" rather than forcing the column wider. */}
                  <Link
                    href={`/products?category=${section.path}`}
                    className="mb-2.5 block border-b border-red/20 pb-2 font-head text-[14px] font-bold uppercase leading-tight tracking-[0.12em] text-red transition break-words hover:text-white"
                  >
                    {section.name}
                  </Link>
                  <ul className="space-y-0.5">
                    {section.children.length > 0 ? (
                      section.children.map((leaf) => (
                        <li key={leaf.id} className="min-w-0">
                          <Link
                            href={`/products?category=${leaf.path}`}
                            className="group/link flex items-start gap-2 rounded px-2 py-1.5 text-[14px] leading-snug text-white/75 transition break-words hover:bg-white/[0.04] hover:text-white"
                          >
                            <span className="mt-0.5 shrink-0 text-red opacity-0 transition group-hover/link:opacity-100">›</span>
                            <span className="-ml-2 min-w-0 transition group-hover/link:ml-0">{leaf.name}</span>
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
                          className="block rounded px-2 py-1.5 text-[14px] leading-snug text-white/75 transition break-words hover:text-white"
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
