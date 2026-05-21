"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, FolderPlus, Pencil, Plus, Search, Trash2, X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import type { CategoryTreeNode } from "@/lib/category-tree";

type EditState = {
  id: string | "__new";
  name: string;
  description: string;
  parentId: string | null;
  sortOrder: number;
};

const MAX_DEPTH = 4;

export function CategoriesClient({ initial }: { initial: CategoryTreeNode[] }) {
  const router = useRouter();
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);

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
    setEditing({ id: "__new", name: "", description: "", parentId, sortOrder: 0 });
  };
  const startEdit = (node: CategoryTreeNode) => {
    setEditing({
      id: node.id,
      name: node.name,
      description: node.description ?? "",
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
    if (!confirm(`Delete "${node.name}"?`)) return;
    const res = await fetch(`/api/admin/categories?id=${node.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? "Failed to delete"); return; }
    toast.success("Category deleted");
    // Step out if we just deleted the current node.
    if (currentId === node.id) setCurrentId(node.parentId ?? null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Click into a category to see what&apos;s inside it. Add sub-categories
          to nest deeper. URLs like <code className="font-mono text-[12px]">/category/brake/brake-pads</code> are built from this tree.
        </p>
      </header>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search categories…"
          className="h-9 pl-8 pr-8"
        />
        {q && (
          <button type="button" onClick={() => setQ("")}
            className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
          ><X className="h-3 w-3" /></button>
        )}
      </div>

      {searchHits ? (
        <Card>
          <CardContent className="p-0">
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
          </CardContent>
        </Card>
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
            {canAddChild && (
              <Button size="sm" onClick={() => startCreate(currentId)}>
                <Plus className="h-3.5 w-3.5" />
                {currentId ? "Add sub-category" : "New top-level"}
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
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
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
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
    </div>
  );
}

function RowItem({
  node, onOpen, onEdit, onDelete,
}: {
  node: CategoryTreeNode;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasChildren = node.children.length > 0;
  return (
    <li className="group flex items-center gap-2 px-4 py-2.5 transition hover:bg-muted/40">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-center gap-2 text-left text-sm"
      >
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
