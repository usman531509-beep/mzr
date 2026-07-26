"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavCategoryNode } from "@/lib/nav-cache";

// Reference-style listing sidebar (.sidebar-filters) hosting the collapsible
// category tree (.cat-tree). Desktop: sticky left column of the .listing
// grid. Mobile: slide-in drawer opened via the red "Filters" toggle button
// (+ scrim), matching the engine-aid-hub mockups.
//
// Top-level rows navigate on click; the chevron expands/collapses children.
// Selected node + its ancestors highlight, and any branch that contains the
// selection is auto-expanded on first render so the user lands with the
// right context already open.

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

  // Mobile drawer + collapsible "Categories" group (presentation only).
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  // Lock body scroll while the drawer is open (reference behaviour).
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <>
      <button
        type="button"
        className="filter-drawer-toggle"
        onClick={() => setDrawerOpen(true)}
        aria-expanded={drawerOpen}
      >
        ☰ Filters
      </button>
      <div
        className={cn("filter-scrim", drawerOpen && "open")}
        onClick={closeDrawer}
        aria-hidden="true"
      />
      <aside className={cn("sidebar-filters", drawerOpen && "open")}>
        <div className="close-drawer">
          <button type="button" aria-label="Close filters" onClick={closeDrawer}>
            ×
          </button>
        </div>
        <div className={cn("cat-tree filter-group", collapsed && "collapsed")}>
          <h4 onClick={() => setCollapsed((c) => !c)}>Categories</h4>
          <div className="fg-body">
            <Link
              href="/products"
              onClick={closeDrawer}
              className={cn("cat-link", !selectedPath && "active")}
            >
              All products
            </Link>
            {tree.map((node) => (
              <CategoryRow
                key={node.id}
                node={node}
                depth={0}
                selectedPath={selectedPath ?? null}
                openPaths={openPaths}
                onToggle={toggle}
                onNavigate={closeDrawer}
              />
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

function CategoryRow({
  node, depth, selectedPath, openPaths, onToggle, onNavigate,
}: {
  node: NavCategoryNode;
  depth: number;
  selectedPath: string | null;
  openPaths: Set<string>;
  onToggle: (path: string) => void;
  onNavigate: () => void;
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
    <div>
      <div className="flex items-center">
        <Link
          href={`/products?category=${node.path}`}
          onClick={onNavigate}
          className={cn(
            "min-w-0 flex-1 truncate",
            depth === 0 && "cat-link",
            isSelected && "active",
            isAncestor && (depth === 0 ? "open" : "font-semibold text-ink"),
          )}
        >
          {node.name}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => onToggle(node.path)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:text-red"
            aria-label={isOpen ? "Collapse" : "Expand"}
            aria-expanded={isOpen}
          >
            <ChevronRight
              className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")}
            />
          </button>
        )}
      </div>
      {hasChildren && isOpen && (
        <div className="cat-sub">
          {node.children.map((child) => (
            <CategoryRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              openPaths={openPaths}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
