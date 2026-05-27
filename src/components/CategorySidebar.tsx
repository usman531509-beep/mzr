"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavCategoryNode } from "@/lib/nav-cache";

// Collapsible category tree shown on the left of /products and
// /category/[...path]. Top-level rows act as expanders; clicking the name
// also navigates to that category. Selected node + its ancestors highlight,
// and any branch that contains the selection is auto-expanded on first
// render so the user lands with the right context already open.

export function CategorySidebar({
  tree,
  selectedPath,
}: {
  tree: NavCategoryNode[];
  selectedPath?: string | null;
}) {
  // Pre-compute the set of paths to expand: every ancestor of the selection
  // gets opened so the user sees their current location in the tree without
  // having to expand manually.
  const initialOpen = useMemo(() => {
    const open = new Set<string>();
    if (!selectedPath) return open;
    const segs = selectedPath.split("/");
    for (let i = 1; i < segs.length; i++) {
      open.add(segs.slice(0, i).join("/"));
    }
    return open;
  }, [selectedPath]);

  const [openPaths, setOpenPaths] = useState<Set<string>>(initialOpen);
  const toggle = (path: string) => {
    setOpenPaths((s) => {
      const next = new Set(s);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <aside className="hidden w-[300px] shrink-0 lg:block">
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
        <div className="mb-4 text-[14px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Categories
        </div>
        <ul className="space-y-1.5">
          <li>
            <Link
              href="/products"
              className={cn(
                "block rounded px-3 py-3 text-[18px] transition",
                !selectedPath
                  ? "bg-primary/10 text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              All products
            </Link>
          </li>
          {tree.map((node) => (
            <CategoryRow
              key={node.id}
              node={node}
              selectedPath={selectedPath ?? null}
              openPaths={openPaths}
              onToggle={toggle}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}

function CategoryRow({
  node, selectedPath, openPaths, onToggle,
}: {
  node: NavCategoryNode;
  selectedPath: string | null;
  openPaths: Set<string>;
  onToggle: (path: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = openPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  // Ancestor of the selection? Highlight subtly so the trail back to the
  // chosen leaf stays visible.
  const isAncestor =
    !!selectedPath &&
    selectedPath !== node.path &&
    selectedPath.startsWith(`${node.path}/`);

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded transition",
          isSelected && "bg-primary/10",
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.path)}
            className="flex h-11 w-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            <ChevronRight
              className={cn("h-5 w-5 transition-transform", isOpen && "rotate-90")}
            />
          </button>
        ) : (
          <span className="block h-11 w-8 shrink-0" />
        )}
        <Link
          href={`/products?category=${node.path}`}
          className={cn(
            "flex-1 truncate py-2.5 pr-2 text-[18px] transition",
            isSelected
              ? "font-semibold text-foreground"
              : isAncestor
                ? "text-foreground hover:text-foreground"
                : "text-muted-foreground hover:text-foreground",
          )}
        >
          {node.name}
        </Link>
      </div>
      {hasChildren && isOpen && (
        <ul className="ml-4 mt-1.5 space-y-1.5 border-l border-border/70 pl-2.5">
          {node.children.map((child) => (
            <CategoryRow
              key={child.id}
              node={child}
              selectedPath={selectedPath}
              openPaths={openPaths}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
