"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Package } from "lucide-react";

import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export type EditableLayer = {
  id: string;
  product: { name: string; sku: string | null; image: string | null };
  qtyReceived: number;
  qtyRemaining: number;
  unitCost: number;
  unitRetail: number | null;
  notes: string | null;
  source: "MANUAL_ADJUSTMENT" | "INITIAL";
};

export function StockReceiptEditDialog({
  layer, onClose,
}: {
  layer: EditableLayer | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [qtyReceived, setQtyReceived] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [unitRetail, setUnitRetail] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  // Refill the form whenever a different layer is opened.
  useEffect(() => {
    if (!layer) return;
    setQtyReceived(String(layer.qtyReceived));
    setUnitCost(String(layer.unitCost));
    setUnitRetail(layer.unitRetail == null ? "" : String(layer.unitRetail));
    setNotes(layer.notes ?? "");
  }, [layer]);

  if (!layer) return null;
  const consumed = layer.qtyReceived - layer.qtyRemaining;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(qtyReceived, 10);
    const cost = parseFloat(unitCost);
    const retail = parseFloat(unitRetail);

    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Quantity must be a positive whole number");
      return;
    }
    if (qty < consumed) {
      toast.error(`Quantity can't be below ${consumed} (already sold)`);
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) { toast.error("Cost price is invalid"); return; }
    if (unitRetail !== "" && (!Number.isFinite(retail) || retail < 0)) {
      toast.error("Retail price is invalid");
      return;
    }

    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        qtyReceived: qty,
        unitCost: cost,
        notes: notes.trim() || null,
      };
      if (unitRetail !== "") body.unitRetail = retail;

      const res = await fetch(`/api/admin/stock-received/${layer.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Could not save");
        return;
      }
      toast.success("Batch updated");
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit batch</DialogTitle>
          <DialogDescription>
            Update this batch&apos;s quantity, cost, retail, or notes. Cost and
            retail only affect future sales — already-sold units keep the
            cost they were sold at.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
          <div className="flex items-start gap-3">
            {layer.product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={layer.product.image} alt="" className="h-10 w-10 shrink-0 rounded border border-border object-cover" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border bg-muted/30">
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 font-medium">{layer.product.name}</div>
              {layer.product.sku && (
                <div className="font-mono text-[11px] text-muted-foreground">SKU {layer.product.sku}</div>
              )}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <Stat label="Received" value={`${layer.qtyReceived}`} />
            <Stat label="Sold" value={`${consumed}`} />
            <Stat label="Remaining" value={`${layer.qtyRemaining}`} />
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Quantity received * (min ${consumed})`}>
              <Input
                type="number"
                inputMode="numeric"
                min={Math.max(1, consumed)}
                step={1}
                value={qtyReceived}
                onChange={(e) => setQtyReceived(e.target.value)}
                required
              />
            </Field>
            <Field label="Notes (optional)">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Counted in stock-take"
                maxLength={500}
              />
            </Field>
            <Field label="Cost price *">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                required
              />
            </Field>
            <Field label="Retail price *">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={unitRetail}
                onChange={(e) => setUnitRetail(e.target.value)}
                placeholder="0.00"
                required
              />
            </Field>
          </div>

          {consumed > 0 && (
            <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">{consumed} unit{consumed === 1 ? "" : "s"}</strong> from this batch {consumed === 1 ? "has" : "have"} already been sold. The cost recorded for those sales is locked in and won&apos;t change. Edits here only affect the remaining {layer.qtyRemaining} unit{layer.qtyRemaining === 1 ? "" : "s"} and future sales.
            </div>
          )}

          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
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
