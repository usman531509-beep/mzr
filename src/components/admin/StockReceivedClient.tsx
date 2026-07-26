"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { confirmAction } from "@/lib/confirm-store";
import {
  Boxes, Layers, Package, Pencil, Plus, Search, Trash2, Wrench, X,
} from "lucide-react";

import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StockReceiptDialog, type ReceiptProduct } from "@/components/admin/StockReceiptDialog";
import {
  StockReceiptEditDialog, type EditableLayer,
} from "@/components/admin/StockReceiptEditDialog";

type LayerSource = "MANUAL_ADJUSTMENT" | "INITIAL";

type LayerRow = {
  id: string;
  receivedAt: string;
  source: LayerSource;
  unitCost: number;
  unitRetail: number | null;
  qtyReceived: number;
  qtyRemaining: number;
  notes: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    image: string | null;
  };
};

// Reference-theme .st badge modifier per layer source.
const SOURCE_META: Record<LayerSource, { label: string; icon: typeof Boxes; className: string }> = {
  MANUAL_ADJUSTMENT: { label: "Stock received",    icon: Wrench, className: "ok" },
  INITIAL:           { label: "Initial / backfill", icon: Layers, className: "muted" },
};

export function StockReceivedClient({
  rows, products,
}: {
  rows: LayerRow[];
  products: ReceiptProduct[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EditableLayer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const status = params.get("status") ?? "";

  const handleDelete = async (r: LayerRow) => {
    const consumed = r.qtyReceived - r.qtyRemaining;
    const label = `${r.product.name} (${r.qtyReceived} unit${r.qtyReceived === 1 ? "" : "s"})`;
    const ok = await confirmAction({
      title: "Delete batch?",
      description: consumed > 0
        ? `${label}. ${consumed} unit${consumed === 1 ? "" : "s"} already sold — the API will reject this delete.`
        : `${label}. This removes ${r.qtyReceived} unit${r.qtyReceived === 1 ? "" : "s"} from stock.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setDeletingId(r.id);
    try {
      const res = await fetch(`/api/admin/stock-received/${r.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Could not delete");
        return;
      }
      toast.success("Batch deleted");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      r.product.name.toLowerCase().includes(needle) ||
      (r.product.sku ?? "").toLowerCase().includes(needle) ||
      (r.notes ?? "").toLowerCase().includes(needle),
    );
  }, [rows, q]);

  const pushParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="space-y-3">
      <div className="toolbar !mb-0">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Product, SKU, notes…"
            className="h-9 !pl-8 !pr-8"
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
        <Select value={status || "all"} onValueChange={(v) => pushParam("status", v === "all" ? "" : v)}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All batches</SelectItem>
            <SelectItem value="remaining">In stock</SelectItem>
            <SelectItem value="depleted">Depleted</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            {filtered.length} of {rows.length} batch{rows.length === 1 ? "" : "es"}
          </div>
          <button type="button" className="btn-red !px-3.5 !py-2 !text-[11px]" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add stock
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Product</th>
              <th>Source</th>
              <th>Received</th>
              <th className="!text-right">Unit cost</th>
              <th className="!text-right">Retail</th>
              <th className="!text-right">Received</th>
              <th className="!text-right">Remaining</th>
              <th className="!text-right">Value left</th>
              <th className="!text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="!py-10 !text-center text-muted-foreground">
                  <Boxes className="mx-auto mb-2 h-6 w-6" />
                  {rows.length === 0
                    ? "No stock received yet — click \"Add stock\" to record a batch."
                    : "No batches match these filters."}
                </td>
              </tr>
            ) : filtered.map((r) => {
              const meta = SOURCE_META[r.source];
              const Icon = meta.icon;
              const consumed = r.qtyReceived - r.qtyRemaining;
              const consumedPct = r.qtyReceived > 0 ? Math.min(100, Math.round((consumed / r.qtyReceived) * 100)) : 0;
              return (
                <tr key={r.id} className="align-top">
                  <td>
                    <div className="flex items-start gap-3">
                      {r.product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.product.image}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded border border-line bg-white object-contain"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-line bg-white">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/admin/stock?q=${encodeURIComponent(r.product.name)}`}
                          className="line-clamp-2 font-semibold hover:underline"
                        >
                          {r.product.name}
                        </Link>
                        {r.product.sku && (
                          <div className="font-mono text-[11px] text-muted-foreground">SKU {r.product.sku}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`st ${meta.className} inline-flex items-center gap-1`}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </span>
                    {r.notes && (
                      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground italic">
                        “{r.notes}”
                      </div>
                    )}
                  </td>
                  <td>
                    <div>{new Date(r.receivedAt).toLocaleDateString("en-GB")}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(r.receivedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </td>
                  <td className="!text-right font-mono tabular-nums">
                    {fmtMoney(r.unitCost)}
                  </td>
                  <td className="!text-right font-mono tabular-nums">
                    {r.unitRetail == null ? <span className="text-muted-foreground">—</span> : fmtMoney(r.unitRetail)}
                  </td>
                  <td className="!text-right tabular-nums">
                    {r.qtyReceived}
                  </td>
                  <td className="!text-right">
                    <div className="tabular-nums font-semibold">
                      {r.qtyRemaining}
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">/ {r.qtyReceived}</span>
                    </div>
                    <div className="mt-1 ml-auto h-1 w-20 overflow-hidden rounded-full bg-soft">
                      <div
                        className={`h-full ${
                          r.qtyRemaining === 0
                            ? "bg-red"
                            : consumedPct > 70
                              ? "bg-[#b8860b]"
                              : "bg-[#0a8a3a]"
                        }`}
                        style={{ width: `${consumedPct}%` }}
                      />
                    </div>
                  </td>
                  <td className="!text-right tabular-nums font-semibold">
                    {fmtMoney(r.qtyRemaining * r.unitCost)}
                  </td>
                  <td className="!text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => setEditing({
                          id: r.id,
                          product: { name: r.product.name, sku: r.product.sku, image: r.product.image },
                          qtyReceived: r.qtyReceived,
                          qtyRemaining: r.qtyRemaining,
                          unitCost: r.unitCost,
                          unitRetail: r.unitRetail,
                          notes: r.notes,
                          source: r.source,
                        })}
                        title="Edit batch"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(r)}
                        disabled={deletingId === r.id || consumed > 0}
                        title={
                          consumed > 0
                            ? "Can't delete — some units already sold"
                            : "Delete batch"
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <StockReceiptDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        products={products}
      />

      <StockReceiptEditDialog
        layer={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
