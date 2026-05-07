"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, MoreHorizontal, ExternalLink, Pencil, Trash2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export type DashboardCategory = {
  id: string; name: string; slug: string;
  productCount: number;
  recent: { id: string; name: string; price: string; stock: number; image: string | null }[];
};

export type DashboardProduct = {
  id: string; name: string; slug: string;
  price: string; costPrice: string | null; stock: number;
  brand: string; category: string; categorySlug: string;
  featured: boolean; active: boolean;
  image: string | null;
  description: string;
  brandId: string; categoryId: string;
  sku: string | null;
  oemNumber: string | null;
  images: string[];
  compatibilities: { bikeModelId: string; yearFrom: number; yearTo: number }[];
};

const ICON: Record<string, string> = {
  engine: "🔧", body: "🛠️", tyres: "🛞", brakes: "🛑", electrical: "⚡", suspension: "🪛",
};

export function DashboardClient({
  categoriesData, products, brands, categories, models,
}: {
  categoriesData: DashboardCategory[];
  products: DashboardProduct[];
  brands: Brand[];
  categories: Category[];
  models: BikeModel[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DashboardProduct | undefined>();
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | undefined>();

  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  const filtered = products.filter((p) => {
    if (filterCat !== "all" && p.categorySlug !== filterCat) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase()) &&
        !p.brand.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const openNew = (categoryId?: string) => {
    setEditing(undefined);
    setDefaultCategoryId(categoryId);
    setOpen(true);
  };
  const openEdit = (p: DashboardProduct) => {
    setEditing(p);
    setDefaultCategoryId(undefined);
    setOpen(true);
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Part deleted");
      router.refresh();
    } else {
      toast.error("Failed to delete");
    }
  };

  return (
    <>
      {/* ── PARTS BY CATEGORY ─────────────────────────────────── */}
      <Card>
        <CardHeader className="flex-row items-end justify-between">
          <div>
            <CardTitle className="text-lg">Parts by category</CardTitle>
            <CardDescription>Add parts directly into a category — they show on the storefront immediately.</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/categories">Manage categories</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categoriesData.map((c) => (
              <div key={c.id} className="rounded-lg border border-border bg-background p-4 transition hover:border-primary/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{ICON[c.slug] ?? "📦"}</span>
                      <h3 className="truncate text-sm font-semibold">{c.name}</h3>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {c.productCount} part{c.productCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openNew(c.id)}>
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>

                {c.recent.length > 0 ? (
                  <ul className="mt-3 space-y-1.5">
                    {c.recent.map((r) => (
                      <li key={r.id} className="flex items-center gap-2.5">
                        <div className="h-7 w-7 shrink-0 overflow-hidden rounded bg-muted">
                          {r.image && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={r.image} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs">{r.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {fmtMoney(r.price)} · stock {r.stock}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 rounded border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
                    No parts in this category yet.
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                  <Link
                    href={`/products?category=${c.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" /> View on store
                  </Link>
                  {c.productCount > 3 && (
                    <button
                      onClick={() => setFilterCat(c.slug)}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Filter table →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── ALL PARTS TABLE ───────────────────────────────────── */}
      <Card className="mt-6">
        <CardHeader className="flex-row items-end justify-between gap-3">
          <div>
            <CardTitle className="text-lg">All parts</CardTitle>
            <CardDescription>Search, filter, edit or delete any part.</CardDescription>
          </div>
          <Button onClick={() => openNew()}>
            <Plus className="h-3.5 w-3.5" /> New part
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or brand…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoriesData.map((c) => (
                  <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                ))}
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
                  <TableHead className="w-[44%]">Part</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
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
                          <div className="text-[11px] text-muted-foreground">{p.compatibilities.length} fitments</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.category}</TableCell>
                    <TableCell className="text-sm">{p.brand}</TableCell>
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
                          <DropdownMenuItem onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => del(p.id, p.name)}
                            className="text-destructive focus:text-destructive"
                          >
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
        defaultCategoryId={defaultCategoryId}
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
    </>
  );
}
