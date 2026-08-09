"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, FolderPlus, Image as ImageIcon, PackagePlus, Pencil, Plus, RotateCcw, Search, Trash2, X,
} from "lucide-react";

import { confirmAction } from "@/lib/confirm-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import type { CategoryTreeNode } from "@/lib/category-tree";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  PartDialog, type Brand, type ProductBrand, type Category, type BikeModel,
} from "@/components/admin/PartDialog";

type EditState = {
  id: string | "__new";
  name: string;
  description: string;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
};

const MAX_DEPTH = 4;

type DeletedCategoryRow = {
  id: string;
  name: string;
  path: string;
  depth: number;
  deletedAt: string;
  // How many sub-categories / products will come back when this row is
  // restored — surfaced inline so the admin sees the blast radius before
  // clicking. Computed server-side by walking the path-prefix subtree.
  cascadeSubCount: number;
  cascadeProductCount: number;
};

export function CategoriesClient({
  initial, deleted, brands, productBrands, categories, models,
}: {
  initial: CategoryTreeNode[];
  deleted: DeletedCategoryRow[];
  brands: Brand[];
  productBrands: ProductBrand[];
  categories: Category[];
  models: BikeModel[];
}) {
  const router = useRouter();
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);
  // Category id whose "Add a new part" dialog is open (null = closed). Opens the
  // shared PartDialog inline with this category pre-selected.
  const [addProductCatId, setAddProductCatId] = useState<string | null>(null);
  // Toggle between the live tree explorer and the flat soft-delete bin. Kept
  // client-side because both lists come pre-loaded from the server.
  const [view, setView] = useState<"live" | "deleted">("live");

  // Flatten the tree into a lookup so we can resolve `currentId` to its
  // children, ancestors, and own row without recursing every render.
  const { byId, childrenOf } = useMemo(() => {
    const byId = new Map<string, CategoryTreeNode>();
    const childrenOf = new Map<string | null, CategoryTreeNode[]>();
    childrenOf.set(null, initial);
    const walk = (nodes: CategoryTreeNode[]) => {
      for (const n of nodes) {
        byId.set(n.id, n);
        childrenOf.set(n.id, n.children);
        if (n.children.length) walk(n.children);
      }
    };
    walk(initial);
    return { byId, childrenOf };
  }, [initial]);

  const current = currentId ? byId.get(currentId) : null;
  const ancestors: CategoryTreeNode[] = [];
  {
    let cur = current;
    while (cur) {
      ancestors.unshift(cur);
      cur = cur.parentId ? byId.get(cur.parentId) ?? null : null;
    }
  }
  const visible = childrenOf.get(currentId) ?? [];
  const canAddChild = current ? current.depth < MAX_DEPTH : true;

  // Search bumps users into a flat list of matches across the whole tree.
  const searchHits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return null;
    const all: CategoryTreeNode[] = [];
    const walk = (ns: CategoryTreeNode[]) => {
      for (const n of ns) {
        if (n.name.toLowerCase().includes(s)) all.push(n);
        if (n.children.length) walk(n.children);
      }
    };
    walk(initial);
    return all;
  }, [initial, q]);

  const startCreate = (parentId: string | null) => {
    setEditing({ id: "__new", name: "", description: "", imageUrl: null, parentId, sortOrder: 0 });
  };
  // Open the shared "Add a new part" dialog inline, pre-selected on this
  // category, so the admin adds products straight into it without picking it
  // manually or leaving the page. Only leaf categories can hold products.
  const addProductTo = (categoryId: string) => {
    setAddProductCatId(categoryId);
  };
  const startEdit = (node: CategoryTreeNode) => {
    setEditing({
      id: node.id,
      name: node.name,
      description: node.description ?? "",
      imageUrl: node.imageUrl ?? null,
      parentId: node.parentId,
      sortOrder: node.sortOrder,
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.name.trim()) return;
    setBusy(true);
    try {
      const url = editing.id === "__new"
        ? "/api/admin/categories"
        : `/api/admin/categories/${editing.id}`;
      const method = editing.id === "__new" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          description: editing.description || null,
          imageUrl: editing.imageUrl || null,
          parentId: editing.parentId,
          sortOrder: editing.sortOrder,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Save failed"); return; }
      toast.success(editing.id === "__new" ? "Category created" : "Category updated");
      setEditing(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const del = async (node: CategoryTreeNode) => {
    // Preview the cascade: sub-categories go to the bin with this one, but
    // products only get *orphaned* (their category link is parked into
    // savedCategoryId so a restore can rehome them later).
    const subBlurb = node.childCount > 0
      ? ` ${node.childCount} sub-categor${node.childCount === 1 ? "y" : "ies"} will be deleted with it.`
      : "";
    const prodBlurb = node.productCount > 0
      ? ` ${node.productCount} product${node.productCount === 1 ? "" : "s"} will become uncategorised — they stay live and can be reassigned or auto-rehomed by restoring this category.`
      : "";
    const ok = await confirmAction({
      title: `Delete "${node.name}"?`,
      description:
        `The category moves to the Deleted tab.${subBlurb}${prodBlurb} Order history is unaffected.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/categories?id=${node.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({} as { error?: string; categoriesDeleted?: number; orphanedProducts?: number }));
    if (!res.ok) { toast.error(data.error ?? "Failed to delete"); return; }
    const extras: string[] = [];
    if ((data.categoriesDeleted ?? 1) > 1) extras.push(`${data.categoriesDeleted! - 1} sub-categor${data.categoriesDeleted! - 1 === 1 ? "y" : "ies"}`);
    if ((data.orphanedProducts ?? 0) > 0) extras.push(`${data.orphanedProducts} product${data.orphanedProducts === 1 ? "" : "s"} orphaned`);
    toast.success(
      extras.length > 0
        ? `Moved to Deleted (${extras.join(" · ")})`
        : "Category moved to the Deleted tab",
    );
    if (currentId === node.id) setCurrentId(node.parentId ?? null);
    router.refresh();
  };

  const restore = async (row: DeletedCategoryRow) => {
    const res = await fetch(`/api/admin/categories/${row.id}/restore`, { method: "POST" });
    const data = await res.json().catch(() => ({} as { error?: string; categoriesRestored?: number; productsRehomed?: number }));
    if (!res.ok) { toast.error(data.error ?? "Failed to restore"); return; }
    const extras: string[] = [];
    if ((data.categoriesRestored ?? 1) > 1) extras.push(`${data.categoriesRestored! - 1} sub-categor${data.categoriesRestored! - 1 === 1 ? "y" : "ies"}`);
    if ((data.productsRehomed ?? 0) > 0) extras.push(`${data.productsRehomed} product${data.productsRehomed === 1 ? "" : "s"} rehomed`);
    toast.success(
      extras.length > 0
        ? `"${row.name}" restored (${extras.join(" · ")})`
        : `"${row.name}" restored`,
    );
    router.refresh();
  };

  // Permanent delete from the Deleted tab. The server checks blockers —
  // child categories, attached products, pending rehome snapshots, or a
  // tied trade-discount rule — and refuses with a friendly reason if any
  // are still in the way.
  const purge = async (row: DeletedCategoryRow) => {
    const ok = await confirmAction({
      title: `Permanently delete "${row.name}"?`,
      description: "This wipes the category row from the database completely. It cannot be undone. The server will refuse if any sub-categories, products, or trade-discount rules still reference it.",
      confirmLabel: "Delete permanently",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/categories/${row.id}/purge`, { method: "DELETE" });
    const data = await res.json().catch(() => ({} as { error?: string }));
    if (!res.ok) { toast.error(data.error ?? "Could not permanently delete"); return; }
    toast.success(`"${row.name}" permanently deleted`);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="adm-top !mb-0">
        <div>
          <div className="crumb">Admin</div>
          <h1 className="font-head text-3xl font-normal uppercase leading-none tracking-wide">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Click into a category to see what&apos;s inside it. Add sub-categories
            to nest deeper. URLs like <code className="kbd">/category/brake/brake-pads</code> are built from this tree.
          </p>
        </div>
      </div>

      <div role="tablist" aria-label="Category view" className="chips !mb-0">
        <button
          type="button"
          role="tab"
          aria-selected={view === "live"}
          onClick={() => setView("live")}
          className={`chip inline-flex items-center gap-2 ${view === "live" ? "active" : ""}`}
        >
          Live
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "deleted"}
          onClick={() => setView("deleted")}
          className={`chip inline-flex items-center gap-2 ${view === "deleted" ? "active" : ""}`}
        >
          <Trash2 className="h-3 w-3" />
          Deleted
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            view === "deleted" ? "bg-white/25" : "bg-soft text-muted-foreground"
          }`}>{deleted.length}</span>
        </button>
      </div>

      {view === "deleted" ? (
        <div className="table-wrap">
          <div>
            {deleted.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
                <Trash2 className="h-7 w-7" />
                No deleted categories. Anything you delete from the Live tab will land here.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {deleted.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{d.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        /{d.path}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Deleted {new Date(d.deletedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                        {(d.cascadeSubCount > 0 || d.cascadeProductCount > 0) && (() => {
                          const parts: string[] = [];
                          if (d.cascadeSubCount > 0) parts.push(`${d.cascadeSubCount} sub-categor${d.cascadeSubCount === 1 ? "y" : "ies"}`);
                          if (d.cascadeProductCount > 0) parts.push(`rehome ${d.cascadeProductCount} product${d.cascadeProductCount === 1 ? "" : "s"}`);
                          return <> · restoring brings back {parts.join(" + ")}</>;
                        })()}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restore(d)}
                        className="h-8 gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => purge(d)}
                        title="Delete permanently"
                        aria-label="Delete permanently"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
      <>
      <div className="toolbar !mb-0">
      <div className="relative min-w-[220px] max-w-sm flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search categories…"
          className="h-9 !pl-8 !pr-8"
        />
        {q && (
          <button type="button" onClick={() => setQ("")}
            className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
          ><X className="h-3 w-3" /></button>
        )}
      </div>
      </div>

      {searchHits ? (
        <div className="table-wrap">
          <div>
            {searchHits.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No categories match &quot;{q}&quot;.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {searchHits.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => { setQ(""); setCurrentId(n.id); }}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/40"
                    >
                      <span>{n.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        /{n.path}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Breadcrumb / level header. Always shows what level you're looking
              at and a Back affordance when nested. */}
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <button
              type="button"
              onClick={() => setCurrentId(null)}
              className={cn(
                "rounded px-2 py-1 transition hover:bg-muted",
                !current && "font-semibold text-foreground",
                current && "text-muted-foreground",
              )}
            >
              All categories
            </button>
            {ancestors.map((a, i) => (
              <span key={a.id} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setCurrentId(a.id)}
                  className={cn(
                    "rounded px-2 py-1 transition hover:bg-muted",
                    i === ancestors.length - 1
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {a.name}
                </button>
              </span>
            ))}
          </div>

          {/* Current-level toolbar: shows the actions for "this" node when
              you're inside one, and an Add button for whatever level you're
              looking at. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {current && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentId(current.parentId ?? null)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Back
                </Button>
              )}
              {current && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(current)}>
                    <Pencil className="h-3.5 w-3.5" /> Rename
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => del(current)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Products live on leaf categories only — offer "Add product"
                  once the current category has no sub-categories. */}
              {current && current.children.length === 0 && (
                <button
                  type="button"
                  className="btn-red !px-3.5 !py-2 !text-[11px]"
                  onClick={() => addProductTo(current.id)}
                >
                  <PackagePlus className="h-3.5 w-3.5" />
                  Add product
                </button>
              )}
              {canAddChild && (
                <button
                  type="button"
                  className={
                    current && current.children.length === 0
                      ? "inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3.5 py-2 text-[11px] font-semibold text-foreground transition hover:bg-muted"
                      : "btn-red !px-3.5 !py-2 !text-[11px]"
                  }
                  onClick={() => startCreate(currentId)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {currentId ? "Add sub-category" : "New top-level"}
                </button>
              )}
            </div>
          </div>

          <div className="table-wrap">
            <div>
              {visible.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
                  <FolderPlus className="h-7 w-7" />
                  {current
                    ? "No sub-categories yet. Add one to nest deeper."
                    : "No categories yet. Create your first top-level category to get started."}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {visible.map((node) => (
                    <RowItem
                      key={node.id}
                      node={node}
                      onOpen={() => setCurrentId(node.id)}
                      onEdit={() => startEdit(node)}
                      onDelete={() => del(node)}
                      onAddProduct={() => addProductTo(node.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
      </>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.id === "__new"
                ? editing.parentId ? "New sub-category" : "New top-level category"
                : "Edit category"}
            </DialogTitle>
            <DialogDescription>
              {editing?.parentId
                ? `Will be created under ${byId.get(editing.parentId)?.name ?? "—"}`
                : "Top-level categories appear on the home page grid and the mega menu."}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={save} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Brake pads"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Input
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <ImageUpload
                label="Image (optional)"
                hint="Shown on the home page category grid. Falls back to an icon if left empty."
                fit="contain"
                value={editing.imageUrl}
                onChange={(url) => setEditing((cur) => (cur ? { ...cur, imageUrl: url } : cur))}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" disabled={busy}>
                  {editing.id === "__new" ? "Create" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Shared "Add a new part" dialog, opened inline from a category with that
          category pre-selected. Refreshing the tree updates product counts. */}
      <PartDialog
        open={!!addProductCatId}
        onOpenChange={(v) => { if (!v) setAddProductCatId(null); }}
        brands={brands}
        productBrands={productBrands}
        categories={categories}
        models={models}
        defaultCategoryId={addProductCatId ?? undefined}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

function RowItem({
  node, onOpen, onEdit, onDelete, onAddProduct,
}: {
  node: CategoryTreeNode;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddProduct: () => void;
}) {
  const hasChildren = node.children.length > 0;
  return (
    <li className="group flex items-center gap-2 px-4 py-2.5 transition hover:bg-muted/40">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-center gap-2 text-left text-sm"
      >
        {node.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={node.imageUrl}
            alt=""
            className="h-8 w-8 shrink-0 rounded border border-border bg-white object-contain p-0.5"
          />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-dashed border-border text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="truncate">{node.name}</span>
        {(node.productCount > 0 || hasChildren) && (
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {node.productCount > 0 && `${node.productCount} ${node.productCount === 1 ? "product" : "products"}`}
            {node.productCount > 0 && hasChildren && " · "}
            {hasChildren && `${node.children.length} sub`}
          </span>
        )}
        {hasChildren && (
          <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition group-hover:opacity-100">
        {/* Products attach to leaf categories only. */}
        {!hasChildren && (
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red"
            onClick={(e) => { e.stopPropagation(); onAddProduct(); }}
            title="Add product to this category"
          >
            <PackagePlus className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Rename"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}
