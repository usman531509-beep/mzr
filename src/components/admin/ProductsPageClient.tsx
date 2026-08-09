"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, MoreHorizontal, Pencil, Trash2, ExternalLink, Search, X, RotateCcw,
} from "lucide-react";

import { confirmAction } from "@/lib/confirm-store";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { fmtMoney } from "@/lib/format";
import {
  PartDialog, type Brand, type ProductBrand, type Category, type BikeModel,
} from "@/components/admin/PartDialog";
import type { DashboardProduct } from "@/components/admin/DashboardClient";

export function ProductsPageClient({
  view, deletedCount, products, brands, productBrands, categories, models, pagination,
  addToCategoryId,
}: {
  // "live" is the default: active + inactive products. "deleted" loads the
  // soft-delete bin with a Restore action. Switching tabs causes a server
  // navigation so pagination + counts stay consistent.
  view: "live" | "deleted";
  deletedCount: number;
  products: DashboardProduct[];
  brands: Brand[];
  productBrands: ProductBrand[];
  categories: Category[];
  models: BikeModel[];
  pagination: { page: number; pageSize: number; total: number };
  // Set when the admin arrives from the Categories page via "Add product":
  // auto-opens the dialog with this category pre-selected.
  addToCategoryId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DashboardProduct | undefined>();
  // Pre-selected category for a brand-new part (empty = none). Set when opening
  // from the Categories page; cleared for a plain "New part".
  const [newCategoryId, setNewCategoryId] = useState("");

  // Auto-open the "add part" dialog with the category pre-filled when we land
  // here from Categories → Add product. Strip the query param afterwards (via
  // history, so no re-render) so a manual refresh doesn't re-open the dialog.
  useEffect(() => {
    if (!addToCategoryId) return;
    if (!categories.some((c) => c.id === addToCategoryId)) return;
    setEditing(undefined);
    setNewCategoryId(addToCategoryId);
    setOpen(true);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/admin/products");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addToCategoryId]);
  const [q, setQ] = useState("");
  const [activeView, setActiveView] = useState<"active" | "inactive">("active");
  const isDeletedView = view === "deleted";

  // Switch between the live catalogue (?view absent) and the soft-delete bin
  // (?view=deleted) via a real navigation so pagination/counts come from the
  // server, not from client-side filtering of a partial dataset.
  const switchView = (next: "live" | "deleted") => {
    if (next === view) return;
    const params = new URLSearchParams();
    if (next === "deleted") params.set("view", "deleted");
    router.push(`/admin/products${params.toString() ? `?${params}` : ""}`);
  };
  const [filterCat, setFilterCat] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterProductBrand, setFilterProductBrand] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStock, setFilterStock] = useState("all");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "name-asc" | "name-desc" |
    "price-asc" | "price-desc" | "stock-asc" | "stock-desc"
  >("newest");

  const anyFilter =
    !!q || filterCat !== "all" || filterBrand !== "all" ||
    filterProductBrand !== "all" ||
    filterStatus !== "all" || filterStock !== "all" || sortBy !== "newest";

  const resetFilters = () => {
    setQ("");
    setFilterCat("all");
    setFilterBrand("all");
    setFilterProductBrand("all");
    setFilterStatus("all");
    setFilterStock("all");
    setSortBy("newest");
  };

  // Smart search: split the query into tokens and require each token to be
  // found somewhere in the product's haystack (name, brand, category, SKU,
  // OEM number). Lets admins type "honda brk" or "BRK-35235" and have the
  // right rows surface.
  const filtered = useMemo(() => {
    const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const LOW_STOCK_THRESHOLD = 5;

    const matched = products.filter((p) => {
      // In the soft-delete bin, every row is by definition "deleted" — the
      // Active/Inactive sub-toggle doesn't apply. In the live view, hide
      // inactive rows from the Active tab and vice versa.
      if (!isDeletedView) {
        if (activeView === "active"   && !p.active) return false;
        if (activeView === "inactive" &&  p.active) return false;
      }
      if (filterCat === "__uncategorised") {
        if (p.categoryId != null) return false;
      } else if (filterCat !== "all" && p.categorySlug !== filterCat) {
        return false;
      }
      if (filterBrand !== "all" && p.brandId !== filterBrand) return false;
      if (filterProductBrand !== "all") {
        if (filterProductBrand === "__none") {
          if (p.productBrandId != null) return false;
        } else if (p.productBrandId !== filterProductBrand) return false;
      }
      if (filterStatus === "featured" && !p.featured) return false;
      if (filterStatus === "demanding" && !p.demanding) return false;
      if (filterStock === "in"  && p.stock <= 0) return false;
      if (filterStock === "out" && p.stock !== 0) return false;
      if (filterStock === "low" && (p.stock <= 0 || p.stock > LOW_STOCK_THRESHOLD)) return false;

      if (tokens.length > 0) {
        const haystack = [
          p.name, p.brand, p.category ?? "",
          p.sku ?? "", p.oemNumber ?? "",
        ].join(" ").toLowerCase();
        for (const t of tokens) {
          if (!haystack.includes(t)) return false;
        }
      }
      return true;
    });

    // Sort. We keep "newest" as the default — the parent already sorted
    // by createdAt desc, so it's just the input order.
    if (sortBy === "newest") return matched;
    const sorted = [...matched];
    switch (sortBy) {
      case "oldest":     sorted.reverse(); break;
      case "name-asc":   sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "name-desc":  sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
      case "price-asc":  sorted.sort((a, b) => Number(a.price) - Number(b.price)); break;
      case "price-desc": sorted.sort((a, b) => Number(b.price) - Number(a.price)); break;
      case "stock-asc":  sorted.sort((a, b) => a.stock - b.stock); break;
      case "stock-desc": sorted.sort((a, b) => b.stock - a.stock); break;
    }
    return sorted;
  }, [products, q, activeView, isDeletedView, filterCat, filterBrand, filterProductBrand, filterStatus, filterStock, sortBy]);

  // Active/inactive counts ignore the active-view toggle itself but respect
  // every other filter — so the pill badges show how many would appear on the
  // opposite tab without losing the rest of the admin's filter context.
  const { activeCount, inactiveCount } = useMemo(() => {
    const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const LOW_STOCK_THRESHOLD = 5;
    let a = 0, i = 0;
    for (const p of products) {
      if (filterCat === "__uncategorised") {
        if (p.categoryId != null) continue;
      } else if (filterCat !== "all" && p.categorySlug !== filterCat) {
        continue;
      }
      if (filterBrand !== "all" && p.brandId !== filterBrand) continue;
      if (filterProductBrand !== "all") {
        if (filterProductBrand === "__none") {
          if (p.productBrandId != null) continue;
        } else if (p.productBrandId !== filterProductBrand) continue;
      }
      if (filterStatus === "featured" && !p.featured) continue;
      if (filterStatus === "demanding" && !p.demanding) continue;
      if (filterStock === "in"  && p.stock <= 0) continue;
      if (filterStock === "out" && p.stock !== 0) continue;
      if (filterStock === "low" && (p.stock <= 0 || p.stock > LOW_STOCK_THRESHOLD)) continue;
      if (tokens.length > 0) {
        const haystack = [p.name, p.brand, p.category ?? "", p.sku ?? "", p.oemNumber ?? ""].join(" ").toLowerCase();
        let miss = false;
        for (const t of tokens) if (!haystack.includes(t)) { miss = true; break; }
        if (miss) continue;
      }
      if (p.active) a++; else i++;
    }
    return { activeCount: a, inactiveCount: i };
  }, [products, q, filterCat, filterBrand, filterProductBrand, filterStatus, filterStock]);

  // Tracks which rows are mid-toggle so the Switch shows as disabled and we
  // don't fire duplicate PATCHes if the admin double-taps. Re-rendered table
  // values come back from router.refresh().
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  const toggleActive = async (id: string, current: boolean) => {
    if (toggling[id]) return;
    setToggling((m) => ({ ...m, [id]: true }));
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: !current }),
      });
      const data = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) {
        toast.error(data.error ?? "Could not update");
        return;
      }
      toast.success(current ? "Product deactivated" : "Product activated");
      router.refresh();
    } finally {
      setToggling((m) => ({ ...m, [id]: false }));
    }
  };

  const del = async (id: string, name: string) => {
    const ok = await confirmAction({
      title: `Delete "${name}"?`,
      description: "The product will be moved to the Deleted tab. It disappears from the storefront, search, and cart, but every existing order keeps its history. You can restore it from the Deleted tab.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({} as { error?: string }));
    if (res.ok) {
      toast.success("Product moved to the Deleted tab");
      router.refresh();
      return;
    }
    toast.error(data.error ?? "Failed to delete");
  };

  const restore = async (id: string, name: string) => {
    const res = await fetch(`/api/admin/products/${id}/restore`, { method: "POST" });
    const data = await res.json().catch(() => ({} as { error?: string }));
    if (res.ok) {
      toast.success(`"${name}" restored`);
      router.refresh();
      return;
    }
    toast.error(data.error ?? "Failed to restore");
  };

  // Permanent delete from the Deleted tab. The server checks FK blockers
  // (order history, PO lines, stock layers) and refuses with a clear
  // reason if anything still references the row.
  const purge = async (id: string, name: string) => {
    const ok = await confirmAction({
      title: `Permanently delete "${name}"?`,
      description: "This wipes the product from the database completely. It cannot be undone. The server will refuse if any orders or stock layers still reference it.",
      confirmLabel: "Delete permanently",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/products/${id}/purge`, { method: "DELETE" });
    const data = await res.json().catch(() => ({} as { error?: string }));
    if (res.ok) {
      toast.success(`"${name}" permanently deleted`);
      router.refresh();
      return;
    }
    toast.error(data.error ?? "Could not permanently delete");
  };

  return (
    <div className="space-y-4">
      <div className="adm-top !mb-0">
        <div>
          <div className="crumb">Admin</div>
          <h1 className="font-head text-3xl font-normal uppercase leading-none tracking-wide">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isDeletedView
              ? `${pagination.total} deleted part${pagination.total === 1 ? "" : "s"}. Restoring puts them back in the catalogue.`
              : `${products.length} parts in catalogue.`}
          </p>
        </div>
        {!isDeletedView && (
          <button
            type="button"
            className="btn-red !px-4 !py-2.5"
            onClick={() => { setEditing(undefined); setNewCategoryId(""); setOpen(true); }}
          >
            <Plus className="h-3.5 w-3.5" /> New part
          </button>
        )}
      </div>

      {/* Three-state tablist:
            Active / Inactive → live catalogue, client-side split
            Deleted          → soft-delete bin, server-side fetched
          Clicking Active or Inactive while in the deleted view triggers a
          real navigation back to the live page. */}
      <div role="tablist" aria-label="Product status" className="chips !mb-0">
        <button
          type="button"
          role="tab"
          aria-selected={!isDeletedView && activeView === "active"}
          onClick={() => { if (isDeletedView) switchView("live"); setActiveView("active"); }}
          className={`chip inline-flex items-center gap-2 ${!isDeletedView && activeView === "active" ? "active" : ""}`}
        >
          Active
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            !isDeletedView && activeView === "active" ? "bg-white/25" : "bg-soft text-muted-foreground"
          }`}>{isDeletedView ? "—" : activeCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isDeletedView && activeView === "inactive"}
          onClick={() => { if (isDeletedView) switchView("live"); setActiveView("inactive"); }}
          className={`chip inline-flex items-center gap-2 ${!isDeletedView && activeView === "inactive" ? "active" : ""}`}
        >
          Inactive
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            !isDeletedView && activeView === "inactive" ? "bg-white/25" : "bg-soft text-muted-foreground"
          }`}>{isDeletedView ? "—" : inactiveCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isDeletedView}
          onClick={() => switchView("deleted")}
          className={`chip inline-flex items-center gap-2 ${isDeletedView ? "active" : ""}`}
        >
          <Trash2 className="h-3 w-3" />
          Deleted
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            isDeletedView ? "bg-white/25" : "bg-soft text-muted-foreground"
          }`}>{deletedCount}</span>
        </button>
      </div>

      <div>
          <div className="toolbar !mb-3">
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Name, brand, category, SKU, OEM…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="!pl-8 !pr-8"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="__uncategorised">Uncategorised</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterBrand} onValueChange={setFilterBrand}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Bike brand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All bike brands</SelectItem>
                {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterProductBrand} onValueChange={setFilterProductBrand}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Product brand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All product brands</SelectItem>
                <SelectItem value="__none">Untagged</SelectItem>
                {productBrands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStock} onValueChange={setFilterStock}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Stock" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stock</SelectItem>
                <SelectItem value="in">In stock</SelectItem>
                <SelectItem value="low">Low (≤ 5)</SelectItem>
                <SelectItem value="out">Out of stock</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="demanding">In demand</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="name-asc">Name A → Z</SelectItem>
                <SelectItem value="name-desc">Name Z → A</SelectItem>
                <SelectItem value="price-asc">Price low → high</SelectItem>
                <SelectItem value="price-desc">Price high → low</SelectItem>
                <SelectItem value="stock-asc">Stock low → high</SelectItem>
                <SelectItem value="stock-desc">Stock high → low</SelectItem>
              </SelectContent>
            </Select>
            {anyFilter && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 px-2 text-[11px] text-muted-foreground">
                Clear filters
              </Button>
            )}
            <div className="ml-auto text-[11px] text-muted-foreground">
              {filtered.length} of {products.length}
            </div>
          </div>

          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th className="w-[40%]">Part</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>Fitments</th>
                  <th className="!text-right">Price</th>
                  <th className="!text-right">Stock</th>
                  <th className="!text-center">{isDeletedView ? "Status" : "Active"}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="!py-10 !text-center text-muted-foreground">
                      {anyFilter
                        ? "No parts match these filters."
                        : isDeletedView
                          ? "No deleted parts. Anything you delete from the Active or Inactive tab will land here."
                          : activeView === "inactive"
                            ? "No inactive parts. Deactivating a part will move it here."
                            : "No active parts yet."}
                    </td>
                  </tr>
                ) : filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded border border-line bg-white">
                          {p.image && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={p.image} alt="" className="h-full w-full object-contain" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-semibold">{p.name}</span>
                            {p.featured && <span className="st warn">Featured</span>}
                            {p.demanding && <span className="st bad">In demand</span>}
                            {/* The active/inactive view toggle already implies
                                this for the inactive tab — only show the badge
                                if an inactive row somehow surfaces on the
                                active tab (shouldn't, but defensive). */}
                            {!p.active && activeView !== "inactive" && (
                              <span className="st muted">Inactive</span>
                            )}
                          </div>
                          {(p.sku || p.oemNumber) && (
                            <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                              {p.sku && <span>SKU: <span className="kbd">{p.sku}</span></span>}
                              {p.oemNumber && <span>OEM: <span className="kbd">{p.oemNumber}</span></span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {p.category ?? (
                        <span
                          className="st warn"
                          title={
                            p.savedCategoryName
                              ? `Category "${p.savedCategoryName}" was deleted. Restoring it rehomes this product; reassigning manually clears the link.`
                              : "Category was deleted. Reassign to surface this product in any category nav."
                          }
                        >
                          Uncategorised
                          {p.savedCategoryName && (
                            <span className="normal-case"> · was {p.savedCategoryName}</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td>{p.brand}</td>
                    <td className="text-muted-foreground">{p.compatibilities.length}</td>
                    <td className="!text-right font-semibold">{fmtMoney(p.price)}</td>
                    <td className={`!text-right ${p.stock === 0 ? "font-semibold text-red" : ""}`}>{p.stock}</td>
                    <td className="!text-center">
                      {isDeletedView ? (
                        <span className="st muted">Deleted</span>
                      ) : (
                        <Switch
                          checked={p.active}
                          disabled={!!toggling[p.id]}
                          onCheckedChange={() => toggleActive(p.id, p.active)}
                          aria-label={p.active ? "Deactivate product" : "Activate product"}
                        />
                      )}
                    </td>
                    <td className="!text-right">
                      {isDeletedView ? (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => restore(p.id, p.name)}
                            className="h-8 gap-1.5"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Restore
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => purge(p.id, p.name)}
                            title="Delete permanently"
                            aria-label="Delete permanently"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/products/${p.slug}`} target="_blank">
                                <ExternalLink className="h-3.5 w-3.5" /> View on store
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditing(p); setOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => del(p.id, p.name)} className="text-destructive focus:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            total={pagination.total}
            pageSize={pagination.pageSize}
            currentPage={pagination.page}
          />
      </div>

      <PartDialog
        open={open}
        onOpenChange={setOpen}
        brands={brands}
        productBrands={productBrands}
        categories={categories}
        models={models}
        defaultCategoryId={editing ? undefined : (newCategoryId || undefined)}
        existing={editing && {
          id: editing.id,
          name: editing.name,
          description: editing.description,
          price: Number(editing.price),
          costPrice: editing.costPrice == null ? null : Number(editing.costPrice),
          stock: editing.stock,
          sku: editing.sku,
          oemNumber: editing.oemNumber,
          brandIds: editing.brandIds,
          productBrandId: editing.productBrandId,
          categoryId: editing.categoryId,
          featured: editing.featured,
          demanding: editing.demanding,
          active: editing.active,
          images: editing.images,
          compatibilities: editing.compatibilities,
        }}
      />
    </div>
  );
}
