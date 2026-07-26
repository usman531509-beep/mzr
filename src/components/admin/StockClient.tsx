"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Loader2, PackageX, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { fmtMoney } from "@/lib/format";

export type StockRow = {
  id: string;
  name: string;
  sku: string | null;
  oemNumber: string | null;
  image: string | null;
  brand: string;
  category: string;
  brandId: string;
  // Nullable for orphaned products (category was soft-deleted).
  categoryId: string | null;
  stock: number;
  lowStockThreshold: number;
  price: number;
  costPrice: number | null;
};

export function StockClient({
  rows, totalAll, brands, categories,
}: {
  rows: StockRow[];
  totalAll: number;
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState<StockRow | null>(null);

  return (
    <div className="space-y-4">
      <AdminFilterBar
        searchPlaceholder="Search name, SKU, OEM…"
        filters={[
          {
            param: "status", label: "Stock status", any: "All stock",
            options: [
              { value: "out", label: "Out of stock" },
              { value: "low", label: "Low stock" },
              { value: "ok",  label: "In stock"   },
            ],
          },
          {
            param: "brand", label: "Brand", any: "All brands",
            options: brands.map((b) => ({ value: b.id, label: b.name })),
          },
          {
            param: "category", label: "Category", any: "All categories",
            options: categories.map((c) => ({ value: c.id, label: c.name })),
          },
        ]}
      />

      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Product</th>
              <th>Brand</th>
              <th className="!text-right">Retail</th>
              <th className="!text-right">Cost</th>
              <th className="!text-right">Margin</th>
              <th className="!text-right">Stock</th>
              <th>Status</th>
              <th className="!text-right">Value (retail)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="!py-10 !text-center text-muted-foreground">
                  {totalAll === 0 ? "No products yet." : "No products match these filters."}
                </td>
              </tr>
            ) : rows.map((r) => {
              const margin = r.costPrice != null ? r.price - r.costPrice : null;
              const marginPct = r.costPrice != null && r.costPrice > 0
                ? ((r.price - r.costPrice) / r.price) * 100
                : null;
              return (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Thumb src={r.image} alt={r.name} />
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{r.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {r.sku && <>SKU {r.sku}{r.oemNumber ? " · " : ""}</>}
                          {r.oemNumber && <>OEM {r.oemNumber}</>}
                          {!r.sku && !r.oemNumber && r.category}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{r.brand}</td>
                  <td className="!text-right tabular-nums">
                    {fmtMoney(r.price)}
                  </td>
                  <td className="!text-right tabular-nums">
                    {r.costPrice == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      fmtMoney(r.costPrice)
                    )}
                  </td>
                  <td className="!text-right tabular-nums">
                    {margin == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={margin >= 0 ? "text-[#0a8a3a]" : "text-red"}>
                        {fmtMoney(margin)}
                        {marginPct != null && (
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            ({marginPct.toFixed(0)}%)
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="!text-right font-semibold tabular-nums">
                    {r.stock}
                    <div className="text-[10px] font-normal text-muted-foreground">
                      ≤ {r.lowStockThreshold}
                    </div>
                  </td>
                  <td>
                    <StockBadge stock={r.stock} threshold={r.lowStockThreshold} />
                  </td>
                  <td className="!text-right tabular-nums">
                    {fmtMoney(r.price * r.stock)}
                  </td>
                  <td className="!text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                      <Pencil className="h-3.5 w-3.5" /> Update
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <StockDialog
        row={editing}
        open={!!editing}
        onOpenChange={(v) => { if (!v) setEditing(null); }}
      />
    </div>
  );
}

function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  if (stock === 0) {
    return (
      <span className="st bad inline-flex items-center gap-1">
        <PackageX className="h-3 w-3" /> Out of stock
      </span>
    );
  }
  if (stock <= threshold) {
    return (
      <span className="st warn inline-flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" /> Low
      </span>
    );
  }
  return (
    <span className="st ok">
      In stock
    </span>
  );
}

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-line bg-white">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-contain" />
      ) : null}
    </div>
  );
}

function StockDialog({
  row, open, onOpenChange,
}: {
  row: StockRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"set" | "delta">("set");
  const [setValue, setSetValue] = useState("");
  const [deltaValue, setDeltaValue] = useState("");
  const [threshold, setThreshold] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [busy, setBusy] = useState(false);

  // Reset state whenever the dialog opens for a different row.
  if (row && setValue === "" && deltaValue === "" && threshold === "" && retailPrice === "") {
    setSetValue(String(row.stock));
    setThreshold(String(row.lowStockThreshold));
    setRetailPrice(String(row.price));
    setCostPrice(row.costPrice == null ? "" : String(row.costPrice));
  }

  const reset = () => {
    setSetValue(""); setDeltaValue(""); setThreshold("");
    setRetailPrice(""); setCostPrice(""); setMode("set");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row) return;
    setBusy(true);
    try {
      // Stock + threshold go via the small stock endpoint.
      const stockBody: Record<string, number> = {};
      if (mode === "set") {
        const n = Number(setValue);
        if (Number.isFinite(n) && n >= 0 && n !== row.stock) stockBody.setStock = Math.floor(n);
      } else {
        const n = Number(deltaValue);
        if (Number.isFinite(n) && n !== 0) stockBody.delta = Math.trunc(n);
      }
      const t = Number(threshold);
      if (Number.isFinite(t) && t >= 0 && t !== row.lowStockThreshold) {
        stockBody.lowStockThreshold = Math.floor(t);
      }

      // Price changes go via the full product PATCH endpoint.
      const priceBody: Record<string, number | null> = {};
      const newRetail = Number(retailPrice);
      if (Number.isFinite(newRetail) && newRetail > 0 && newRetail !== row.price) {
        priceBody.price = newRetail;
      }
      if (costPrice === "") {
        if (row.costPrice != null) priceBody.costPrice = null;
      } else {
        const newCost = Number(costPrice);
        if (Number.isFinite(newCost) && newCost >= 0 && newCost !== row.costPrice) {
          priceBody.costPrice = newCost;
        }
      }

      if (Object.keys(stockBody).length === 0 && Object.keys(priceBody).length === 0) {
        toast.message("Nothing to update");
        onOpenChange(false);
        return;
      }

      const reqs: Promise<Response>[] = [];
      if (Object.keys(stockBody).length > 0) {
        reqs.push(fetch(`/api/admin/products/${row.id}/stock`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(stockBody),
        }));
      }
      if (Object.keys(priceBody).length > 0) {
        reqs.push(fetch(`/api/admin/products/${row.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(priceBody),
        }));
      }
      const results = await Promise.all(reqs);
      if (results.some((r) => !r.ok)) {
        toast.error("Could not save all changes");
        return;
      }
      toast.success("Saved");
      reset();
      onOpenChange(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update stock</DialogTitle>
          <DialogDescription>{row?.name}</DialogDescription>
        </DialogHeader>
        {row && (
          <form onSubmit={submit} className="space-y-4">
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              Current: <span className="font-semibold tabular-nums">{row.stock}</span> · Low threshold:{" "}
              <span className="font-semibold tabular-nums">{row.lowStockThreshold}</span>
            </div>

            <div className="flex gap-2">
              <Button type="button" size="sm" variant={mode === "set" ? "default" : "outline"} onClick={() => setMode("set")}>
                Set absolute
              </Button>
              <Button type="button" size="sm" variant={mode === "delta" ? "default" : "outline"} onClick={() => setMode("delta")}>
                Adjust ± amount
              </Button>
            </div>

            {mode === "set" ? (
              <div>
                <Label className="mb-1.5 block text-xs">New stock level</Label>
                <Input
                  type="number" min={0} step={1}
                  value={setValue}
                  onChange={(e) => setSetValue(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <Label className="mb-1.5 block text-xs">
                  Adjustment <span className="text-muted-foreground">(use minus for stock-out)</span>
                </Label>
                <Input
                  type="number" step={1}
                  placeholder="e.g. 25 or -5"
                  value={deltaValue}
                  onChange={(e) => setDeltaValue(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label className="mb-1.5 block text-xs">Low-stock threshold</Label>
              <Input
                type="number" min={0} step={1}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                You&apos;ll see a Low badge when stock drops to or below this number.
              </p>
            </div>

            <div className="border-t border-border pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pricing
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block text-xs">Retail price (GBP)</Label>
                  <Input
                    type="number" min={0} step="0.01"
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Cost price (GBP)</Label>
                  <Input
                    type="number" min={0} step="0.01"
                    placeholder="Optional"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
