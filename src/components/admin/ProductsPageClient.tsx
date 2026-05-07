"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, ExternalLink, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableHead, TableRow, TableBody, TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { fmtMoney } from "@/lib/format";
import {
  PartDialog, type Brand, type Category, type BikeModel,
} from "@/components/admin/PartDialog";
import type { DashboardProduct } from "@/components/admin/DashboardClient";

export function ProductsPageClient({
  products, brands, categories, models,
}: {
  products: DashboardProduct[];
  brands: Brand[];
  categories: Category[];
  models: BikeModel[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DashboardProduct | undefined>();
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = products.filter((p) => {
    if (filterCat !== "all" && p.categorySlug !== filterCat) return false;
    if (filterStatus === "active" && !p.active) return false;
    if (filterStatus === "inactive" && p.active) return false;
    if (filterStatus === "featured" && !p.featured) return false;
    if (filterStatus === "out" && p.stock > 0) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!p.name.toLowerCase().includes(s) && !p.brand.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Part deleted");
      router.refresh();
    } else toast.error("Failed to delete");
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">{products.length} parts in catalogue.</p>
        </div>
        <Button onClick={() => { setEditing(undefined); setOpen(true); }}>
          <Plus className="h-3.5 w-3.5" /> New part
        </Button>
      </header>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name or brand…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="out">Out of stock</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-[11px] text-muted-foreground">
              {filtered.length} of {products.length}
            </div>
          </div>

          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Part</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Fitments</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      No parts match these filters.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded border border-border bg-muted">
                          {p.image && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={p.image} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium">{p.name}</span>
                            {p.featured && <Badge variant="warning" className="text-[9px]">Featured</Badge>}
                            {!p.active && <Badge variant="secondary" className="text-[9px]">Inactive</Badge>}
                          </div>
                          {p.sku && <div className="text-[11px] text-muted-foreground">SKU: {p.sku}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.category}</TableCell>
                    <TableCell className="text-sm">{p.brand}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.compatibilities.length}</TableCell>
                    <TableCell className="text-right font-medium">{fmtMoney(p.price)}</TableCell>
                    <TableCell className={`text-right ${p.stock === 0 ? "text-destructive" : ""}`}>{p.stock}</TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PartDialog
        open={open}
        onOpenChange={setOpen}
        brands={brands}
        categories={categories}
        models={models}
        existing={editing && {
          id: editing.id,
          name: editing.name,
          description: editing.description,
          price: Number(editing.price),
          costPrice: editing.costPrice == null ? null : Number(editing.costPrice),
          stock: editing.stock,
          sku: editing.sku,
          oemNumber: editing.oemNumber,
          brandId: editing.brandId,
          categoryId: editing.categoryId,
          featured: editing.featured,
          active: editing.active,
          images: editing.images,
          compatibilities: editing.compatibilities,
        }}
      />
    </div>
  );
}
