"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { AdminProductFinder, type FinderProduct } from "@/components/admin/AdminProductFinder";

type Supplier = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  sku: string | null;
  oemNumber: string | null;
  costPrice: number | null;
  retail: number;
  image: string | null;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  fitments: { bikeModelId: string; yearFrom: number; yearTo: number }[];
};
type Line = {
  productId: string | null;
  name: string;
  sku: string | null;
  unitCost: number;
  quantity: number;
};

export function NewPOForm({
  suppliers, products, brands, categories, models,
}: {
  suppliers: Supplier[];
  products: Product[];
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  models: { id: string; name: string; brandId: string; yearStart: number; yearEnd: number }[];
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState<string>("");
  const [status, setStatus] = useState("DRAFT");
  const [expectedAt, setExpectedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Map products to AdminProductFinder shape.
  const finderProducts = useMemo<FinderProduct[]>(
    () => products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      oemNumber: p.oemNumber,
      price: p.retail,
      cost: p.costPrice,
      image: p.image,
      brandId: p.brandId,
      brandName: p.brandName,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      fitments: p.fitments,
    })),
    [products],
  );

  const addLine = (p: Product) => {
    setLines((ls) =>
      ls.some((l) => l.productId === p.id)
        ? ls.map((l) => l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l)
        : [...ls, {
            productId: p.id,
            name: p.name,
            sku: p.sku,
            unitCost: p.costPrice ?? Math.max(0, +(p.retail * 0.6).toFixed(2)),
            quantity: 1,
          }],
    );
  };

  const addLineById = (id: string) => {
    const p = productMap.get(id);
    if (p) addLine(p);
  };

  const addCustom = () => {
    setLines((ls) => [...ls, { productId: null, name: "", sku: "", unitCost: 0, quantity: 1 }]);
  };

  const update = (idx: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, i) => i === idx ? { ...l, ...patch } : l));

  const remove = (idx: number) =>
    setLines((ls) => ls.filter((_, i) => i !== idx));

  const total = lines.reduce((s, l) => s + l.unitCost * l.quantity, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!supplierId) { setErr("Pick a supplier."); return; }
    if (lines.length === 0) { setErr("Add at least one item."); return; }
    if (lines.some((l) => !l.name || l.quantity < 1 || l.unitCost < 0)) {
      setErr("Each line needs a name, qty ≥ 1, and a non-negative cost.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/purchase-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          supplierId,
          status,
          notes: notes || undefined,
          expectedAt: expectedAt || undefined,
          items: lines,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErr(data.error ?? "Could not create PO.");
        return;
      }
      toast.success(`Purchase order ${data.poNumber} created`);
      router.push("/admin/purchase-orders");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-4">
        <Card>
          <CardContent className="grid grid-cols-2 gap-3 p-5">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Supplier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Pick a supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {suppliers.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  No active suppliers. Add one in Suppliers first.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Initial status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["DRAFT", "PLACED", "RECEIVED", "CANCELLED"].map((s) =>
                    <SelectItem key={s} value={s}>{s}</SelectItem>,
                  )}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Status is for tracking only — POs don&apos;t change stock. Log
                arrived stock through &ldquo;Stock Received&rdquo;.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Expected date</Label>
              <Input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Add product</Label>
              <Button type="button" size="sm" variant="outline" onClick={addCustom}>
                <Plus className="h-3.5 w-3.5" /> Custom line
              </Button>
            </div>
            <AdminProductFinder
              products={finderProducts}
              brands={brands}
              categories={categories}
              models={models}
              onAdd={(p) => addLineById(p.id)}
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Line items
            </h2>
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items yet.</p>
            ) : (
              <ul className="space-y-2">
                {lines.map((l, idx) => {
                  const product = l.productId ? productMap.get(l.productId) : null;
                  return (
                    <li key={idx} className="space-y-1.5 rounded border border-border p-2">
                      <div className="flex items-center gap-2">
                        {product ? (
                          <div className="min-w-0 flex-1 text-sm font-medium">{l.name}</div>
                        ) : (
                          <Input
                            value={l.name}
                            onChange={(e) => update(idx, { name: e.target.value })}
                            placeholder="Custom item name"
                            className="h-8 flex-1"
                          />
                        )}
                        <Button
                          type="button" size="icon" variant="ghost"
                          onClick={() => remove(idx)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="mb-1 block text-[10px] uppercase text-muted-foreground">Qty</Label>
                          <div className="flex h-8 items-stretch overflow-hidden rounded-md border border-border">
                            <Button
                              type="button" size="icon" variant="ghost"
                              onClick={() => update(idx, { quantity: Math.max(1, l.quantity - 1) })}
                              disabled={l.quantity <= 1}
                              className="h-full w-7 rounded-none border-r border-border"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number" min={1}
                              value={l.quantity}
                              onChange={(e) => update(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                              className="h-full flex-1 rounded-none border-0 px-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <Button
                              type="button" size="icon" variant="ghost"
                              onClick={() => update(idx, { quantity: l.quantity + 1 })}
                              className="h-full w-7 rounded-none border-l border-border"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="mb-1 block text-[10px] uppercase text-muted-foreground">Unit cost</Label>
                          <Input
                            type="number" min={0} step="0.01"
                            value={l.unitCost}
                            onChange={(e) => update(idx, { unitCost: Math.max(0, Number(e.target.value)) })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="mb-1 block text-[10px] uppercase text-muted-foreground">Line</Label>
                          <div className="h-8 rounded-md border border-border bg-muted/40 px-2 text-right text-sm leading-8 tabular-nums">
                            {fmtMoney(l.unitCost * l.quantity)}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-bold tabular-nums">{fmtMoney(total)}</span>
            </div>
          </CardContent>
        </Card>

        {err && <p className="text-sm text-destructive">{err}</p>}

        <Button type="submit" disabled={busy} className="w-full">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create purchase order
        </Button>
      </div>
    </form>
  );
}
