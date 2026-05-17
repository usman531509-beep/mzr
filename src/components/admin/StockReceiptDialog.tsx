"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Boxes, Check, ChevronsUpDown, Loader2, Package, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

export type ReceiptProduct = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  price: number;       // current retail
  costPrice: number;   // current cost
  brand: string;
  category: string;
  image: string | null;
};

export function StockReceiptDialog({
  open, onClose, products,
}: {
  open: boolean;
  onClose: () => void;
  products: ReceiptProduct[];
}) {
  const router = useRouter();
  const [productId, setProductId] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQ, setPickerQ] = useState("");

  // Form state — initialised once a product is picked.
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId],
  );

  const filtered = useMemo(() => {
    const needle = pickerQ.trim().toLowerCase();
    if (!needle) return products.slice(0, 50);
    return products
      .filter((p) =>
        p.name.toLowerCase().includes(needle) ||
        (p.sku ?? "").toLowerCase().includes(needle) ||
        p.brand.toLowerCase().includes(needle) ||
        p.category.toLowerCase().includes(needle),
      )
      .slice(0, 50);
  }, [products, pickerQ]);

  // Auto-fill the form with the picked product's current cost + retail so
  // admin only has to override the values that actually change.
  const pickProduct = (p: ReceiptProduct) => {
    setProductId(p.id);
    setCostPrice(p.costPrice ? p.costPrice.toString() : "");
    setRetailPrice(p.price.toString());
    setPickerOpen(false);
    setPickerQ("");
  };

  const reset = () => {
    setProductId("");
    setQuantity("");
    setCostPrice("");
    setRetailPrice("");
    setNotes("");
    setBusy(false);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error("Pick a product first");
      return;
    }
    const qty = parseInt(quantity, 10);
    const cost = parseFloat(costPrice);
    const retail = parseFloat(retailPrice);
    if (!Number.isFinite(qty) || qty <= 0) { toast.error("Quantity must be a positive whole number"); return; }
    if (!Number.isFinite(cost) || cost < 0) { toast.error("Cost price must be a non-negative number"); return; }
    if (!Number.isFinite(retail) || retail < 0) { toast.error("Retail price must be a non-negative number"); return; }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/stock-received", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId, quantity: qty, costPrice: cost, retailPrice: retail,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Could not record stock receipt");
        return;
      }
      toast.success(`Added ${qty} unit${qty === 1 ? "" : "s"} of ${selected?.name ?? "product"}`);
      reset();
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record stock received</DialogTitle>
          <DialogDescription>
            Adds units at a specific cost and retail price. Older batches keep
            selling at their original retail until they run out; this batch&apos;s
            retail becomes the catalogue price once it&apos;s next in line.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {/* Product picker */}
          <div className="space-y-1.5">
            <Label className="text-xs">Product *</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-input px-3 text-sm",
                    "hover:border-border focus:outline-none focus:ring-1 focus:ring-ring",
                    !selected && "text-muted-foreground",
                  )}
                >
                  {selected ? (
                    <div className="flex min-w-0 items-center gap-2">
                      {selected.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selected.image} alt="" className="h-6 w-6 rounded border border-border object-cover" />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded border border-border bg-muted/30">
                          <Package className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <span className="truncate">{selected.name}</span>
                    </div>
                  ) : (
                    <span>Pick a product…</span>
                  )}
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(560px,calc(100vw-2rem))] p-0" align="start">
                <div className="border-b border-border p-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoFocus
                      value={pickerQ}
                      onChange={(e) => setPickerQ(e.target.value)}
                      placeholder="Search by name, SKU, brand…"
                      className="h-9 pl-8"
                    />
                  </div>
                </div>
                <div className="max-h-[260px] overflow-y-auto py-1">
                  {filtered.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                      No products match.
                    </div>
                  ) : filtered.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => pickProduct(p)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-accent",
                        p.id === productId && "bg-accent/50",
                      )}
                    >
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt="" className="h-9 w-9 shrink-0 rounded border border-border object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-muted/30">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{p.name}</div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>{p.brand}</span>
                          <span>·</span>
                          <span>{p.category}</span>
                          {p.sku && (<>
                            <span>·</span>
                            <span className="font-mono">SKU {p.sku}</span>
                          </>)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
                        <div className="flex items-center gap-1">
                          <Boxes className="h-3 w-3" />
                          {p.stock}
                        </div>
                        <div>{fmtMoney(p.price)}</div>
                      </div>
                      {p.id === productId && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Current product snapshot — only shown once one is picked */}
          {selected && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Current stock" value={`${selected.stock}`} />
                <Stat label="Current cost" value={fmtMoney(selected.costPrice)} />
                <Stat label="Current retail" value={fmtMoney(selected.price)} />
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {selected.brand} · {selected.category}
                {selected.sku && <> · <span className="font-mono">SKU {selected.sku}</span></>}
              </div>
            </div>
          )}

          {/* The actual receipt inputs */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity received *" full={false}>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 25"
                required
              />
            </Field>
            <Field label="Notes (optional)" full={false}>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Backroom restock"
                maxLength={500}
              />
            </Field>
            <Field label="Cost price (this batch) *" full={false}>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </Field>
            <Field label="Retail price *" full={false}>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </Field>
          </div>

          {selected && Number.isFinite(parseFloat(costPrice)) && Number.isFinite(parseFloat(retailPrice)) && (() => {
            const newQty = parseInt(quantity, 10) || 0;
            const newRetail = parseFloat(retailPrice);
            const retailWillChange = newRetail !== selected.price;
            return (
              <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                <div>After save:</div>
                <ul className="mt-1 space-y-0.5">
                  <li>· Stock becomes <strong className="text-foreground">{selected.stock + newQty}</strong> ({selected.stock} existing + {newQty} new)</li>
                  {selected.stock > 0 && retailWillChange ? (
                    <>
                      <li>
                        · Catalogue keeps showing <strong className="text-foreground">{fmtMoney(selected.price)}</strong> while the <strong className="text-foreground">{selected.stock}</strong> existing unit{selected.stock === 1 ? "" : "s"} {selected.stock === 1 ? "remains" : "remain"} in stock
                      </li>
                      <li>
                        · Switches to <strong className="text-foreground">{fmtMoney(newRetail)}</strong> automatically once those are sold
                      </li>
                    </>
                  ) : (
                    <li>· Catalogue price becomes <strong className="text-foreground">{fmtMoney(newRetail)}</strong></li>
                  )}
                  <li>· Profit on the old units uses their original cost; new units use <strong className="text-foreground">{fmtMoney(parseFloat(costPrice))}</strong></li>
                </ul>
              </div>
            );
          })()}

          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy || !productId}>
              {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Save receipt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2 space-y-1.5" : "space-y-1.5"}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium tabular-nums">{value}</div>
    </div>
  );
}
