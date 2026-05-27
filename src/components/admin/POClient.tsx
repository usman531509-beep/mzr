"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ClipboardList, Eye, FileText, Printer, Trash2,
} from "lucide-react";
import { confirmAction } from "@/lib/confirm-store";
import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export type POSupplier = {
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
};

export type POItem = {
  name: string;
  sku: string | null;
  quantity: number;
  unitCost: number;
};

export type PORow = {
  id: string;
  poNumber: string;
  supplierName: string;
  supplierId: string;
  supplier: POSupplier;
  status: "DRAFT" | "PLACED" | "RECEIVED" | "CANCELLED" | string;
  total: number;
  itemCount: number;
  items: POItem[];
  notes: string | null;
  expectedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  createdBy: string | null;
};

const STATUSES = ["DRAFT", "PLACED", "RECEIVED", "CANCELLED"] as const;

const STATUS_CLASS: Record<string, string> = {
  DRAFT:     "bg-muted text-muted-foreground",
  PLACED:    "bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-500/30 hover:bg-blue-500/15",
  RECEIVED:  "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/15",
  CANCELLED: "bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-500/30 hover:bg-rose-500/15",
};

export function POClient({ rows }: { rows: PORow[] }) {
  const router = useRouter();
  const [doc, setDoc] = useState<{ po: PORow; autoprint: boolean } | null>(null);

  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/purchase-orders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast.error(data.error ?? "Could not update");
      return;
    }
    toast.success(`Status set to ${status}`);
    router.refresh();
  };

  const del = async (id: string, ref: string) => {
    const ok = await confirmAction({
      title: `Delete ${ref}?`,
      description: "Removes this purchase order and its lines. Received stock layers stay untouched.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/purchase-orders/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast.error(data.error ?? "Could not delete");
      return;
    }
    toast.success("PO deleted");
    router.refresh();
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PO</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="p-10 text-center text-sm text-muted-foreground">
                <ClipboardList className="mx-auto mb-2 h-6 w-6" />
                No purchase orders yet.
              </TableCell>
            </TableRow>
          ) : rows.map((p) => (
            <TableRow key={p.id} className="align-top">
              <TableCell className="font-mono text-xs">{p.poNumber}</TableCell>
              <TableCell className="text-sm">{p.supplierName}</TableCell>
              <TableCell>
                <button
                  type="button"
                  onClick={() => setDoc({ po: p, autoprint: false })}
                  className="text-left text-sm underline-offset-2 hover:underline"
                >
                  {p.itemCount} unit{p.itemCount === 1 ? "" : "s"}
                </button>
                {p.expectedAt && (
                  <div className="text-[11px] text-muted-foreground">
                    Expected: {new Date(p.expectedAt).toLocaleDateString("en-GB")}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Select value={p.status} onValueChange={(v) => setStatus(p.id, v)}>
                  <SelectTrigger className={`h-8 w-[130px] ${STATUS_CLASS[p.status] ?? ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">{fmtMoney(p.total)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(p.createdAt).toLocaleDateString("en-GB")}
                {p.createdBy && <div className="text-[10px]">by {p.createdBy}</div>}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => setDoc({ po: p, autoprint: false })}
                    title="View PO"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => setDoc({ po: p, autoprint: true })}
                    title="Print PO"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => del(p.id, p.poNumber)}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    title="Delete PO"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <PODocumentDialog state={doc} onClose={() => setDoc(null)} />
    </>
  );
}

// -----------------------------------------------------------------------------
// PO document dialog + printable HTML (mirrors the order invoice flow).
// -----------------------------------------------------------------------------

function PODocumentDialog({
  state, onClose,
}: {
  state: { po: PORow; autoprint: boolean } | null;
  onClose: () => void;
}) {
  // Fire the iframe print once when this opens with autoprint=true.
  useEffect(() => {
    if (!state?.autoprint) return;
    const t = setTimeout(() => printPoInIframe(state.po), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.po.id, state?.autoprint]);

  if (!state) return null;
  const po = state.po;
  const linesTotal = po.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const totalUnits = po.items.reduce((s, i) => s + i.quantity, 0);
  const supplierLines = [
    po.supplier.address,
    [po.supplier.city, po.supplier.country].filter(Boolean).join(", "),
  ].filter(Boolean) as string[];

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        {/* Header — leave space on the right for the dialog's built-in X. */}
        <DialogHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b border-border bg-card px-5 py-3 pr-14">
          <DialogTitle className="text-sm font-semibold">
            Purchase order {po.poNumber}
          </DialogTitle>
          <Button size="sm" variant="outline" onClick={() => printPoInIframe(po)}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        </DialogHeader>

        <div className="max-h-[80vh] overflow-y-auto bg-white p-8 text-black">
          <div className="mb-8 flex items-start justify-between gap-6">
            <div>
              <div className="text-2xl font-black tracking-tight">MZR PARTS</div>
              <div className="mt-1 text-xs text-gray-500">Motorbike Spares &amp; Accessories</div>
              <div className="mt-3 text-xs leading-relaxed text-gray-600">
                support@mzrparts.com<br />
                Mon–Fri 9–6 · Sat 9–5
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                Purchase order
              </div>
              <div className="mt-1 font-mono text-lg font-bold tracking-tight">{po.poNumber}</div>
              <div className="mt-2 text-xs text-gray-600">
                {new Date(po.createdAt).toLocaleString("en-GB")}
              </div>
              <div className="mt-2 inline-block rounded-full border border-gray-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {po.status}
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-6 rounded-md border border-gray-200 bg-gray-50 p-4 text-xs">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Supplier</div>
              <div className="font-semibold">{po.supplier.name}</div>
              {po.supplier.contactName && <div className="text-gray-700">{po.supplier.contactName}</div>}
              {po.supplier.email && <div className="text-gray-700">{po.supplier.email}</div>}
              {po.supplier.phone && <div className="text-gray-700">{po.supplier.phone}</div>}
              {supplierLines.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Details</div>
              <div>Expected: {po.expectedAt ? new Date(po.expectedAt).toLocaleDateString("en-GB") : "—"}</div>
              <div>Received: {po.receivedAt ? new Date(po.receivedAt).toLocaleDateString("en-GB") : "—"}</div>
              {po.createdBy && <div className="text-gray-700">Raised by {po.createdBy}</div>}
              <div className="mt-2 text-gray-700">{totalUnits} unit{totalUnits === 1 ? "" : "s"} across {po.items.length} line{po.items.length === 1 ? "" : "s"}</div>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300 text-left text-[11px] uppercase tracking-widest text-gray-500">
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Unit cost</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((it, idx) => (
                <tr key={idx} className="border-b border-gray-200 align-top">
                  <td className="py-2">
                    <div className="font-semibold">{it.name}</div>
                    {it.sku && (
                      <div className="mt-0.5 text-[11px] text-gray-500">SKU {it.sku}</div>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">{it.quantity}</td>
                  <td className="py-2 text-right tabular-nums">{fmtMoney(it.unitCost)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtMoney(it.unitCost * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto mt-4 w-full max-w-sm text-sm">
            <PoRow label="Lines total" value={fmtMoney(linesTotal)} />
            <div className="my-2 border-t border-gray-300" />
            <PoRow label="Total" value={fmtMoney(po.total)} strong />
          </div>

          {po.notes && (
            <div className="mt-8 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
              <div className="mb-1 font-semibold uppercase tracking-widest text-gray-500">Notes</div>
              {po.notes}
            </div>
          )}

          <div className="mt-10 grid grid-cols-2 gap-12 pt-8 text-xs text-gray-600">
            <div>
              <div className="mb-12 border-b border-gray-400" />
              Authorised by
            </div>
            <div>
              <div className="mb-12 border-b border-gray-400" />
              Received by
            </div>
          </div>

          <div className="mt-10 text-center text-[10px] text-gray-500">
            <FileText className="mx-auto mb-1 h-3 w-3 opacity-60" />
            Generated by MZR Parts admin · {po.poNumber}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PoRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between py-1 ${strong ? "text-base font-bold" : ""}`}>
      <span className={strong ? "" : "text-gray-600"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

// ---- Print via hidden iframe -----------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function moneyForPrint(n: number): string {
  return fmtMoney(n);
}

function buildPoHtml(po: PORow): string {
  const linesTotal = po.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const totalUnits = po.items.reduce((s, i) => s + i.quantity, 0);
  const date = new Date(po.createdAt).toLocaleString("en-GB");
  const supplierLines = [
    po.supplier.address,
    [po.supplier.city, po.supplier.country].filter(Boolean).join(", "),
  ].filter(Boolean) as string[];
  const rows = po.items
    .map((it) => `
      <tr>
        <td>
          <div class="name">${escapeHtml(it.name)}</div>
          ${it.sku ? `<div class="meta">SKU ${escapeHtml(it.sku)}</div>` : ""}
        </td>
        <td class="r">${it.quantity}</td>
        <td class="r">${moneyForPrint(it.unitCost)}</td>
        <td class="r">${moneyForPrint(it.unitCost * it.quantity)}</td>
      </tr>`)
    .join("");

  return `<!doctype html><html><head>
    <meta charset="utf-8" />
    <title>Purchase order ${escapeHtml(po.poNumber)}</title>
    <style>
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #000; background: #fff; margin: 0;
      }
      .wrap { max-width: 760px; margin: 0 auto; padding: 8mm; }
      .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 24px; }
      .brand { font-size: 22px; font-weight: 900; letter-spacing: -0.02em; }
      .sub { color: #666; font-size: 11px; margin-top: 4px; }
      .meta { color: #444; font-size: 11px; margin-top: 8px; }
      .right { text-align: right; }
      .label { font-size: 10px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: #777; }
      .ref { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 18px; font-weight: 700; margin-top: 4px; }
      .status { display: inline-block; margin-top: 8px; padding: 2px 8px; border: 1px solid #aaa; border-radius: 999px; font-size: 10px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 16px; background: #f6f6f7; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 12px; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { text-align: left; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #777; border-bottom: 2px solid #d4d4d8; padding: 8px 0; }
      td { border-bottom: 1px solid #e5e7eb; padding: 8px 4px; vertical-align: top; }
      td .name { font-weight: 600; }
      td .meta { font-size: 10px; color: #666; margin-top: 2px; }
      td.r, th.r { text-align: right; }
      .totals { margin-left: auto; margin-top: 16px; width: 280px; font-size: 13px; }
      .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
      .totals .sep { border-top: 1px solid #d4d4d8; margin: 8px 0; }
      .totals .grand { font-size: 16px; font-weight: 700; }
      .notes { margin-top: 24px; padding: 12px; background: #f6f6f7; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 12px; }
      .signs { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; font-size: 11px; color: #555; }
      .sig-line { border-bottom: 1px solid #888; height: 32px; margin-bottom: 4px; }
      .foot { margin-top: 32px; text-align: center; font-size: 10px; color: #888; }
    </style>
  </head><body><div class="wrap">
    <div class="head">
      <div>
        <div class="brand">MZR PARTS</div>
        <div class="sub">Motorbike Spares &amp; Accessories</div>
        <div class="meta">support@mzrparts.com<br/>Mon–Fri 9–6 · Sat 9–5</div>
      </div>
      <div class="right">
        <div class="label">Purchase order</div>
        <div class="ref">${escapeHtml(po.poNumber)}</div>
        <div class="meta">${escapeHtml(date)}</div>
        <div class="status">${escapeHtml(po.status)}</div>
      </div>
    </div>

    <div class="grid">
      <div>
        <div class="label" style="margin-bottom:4px;">Supplier</div>
        <div><strong>${escapeHtml(po.supplier.name)}</strong></div>
        ${po.supplier.contactName ? `<div>${escapeHtml(po.supplier.contactName)}</div>` : ""}
        ${po.supplier.email ? `<div>${escapeHtml(po.supplier.email)}</div>` : ""}
        ${po.supplier.phone ? `<div>${escapeHtml(po.supplier.phone)}</div>` : ""}
        ${supplierLines.map((l) => `<div>${escapeHtml(l)}</div>`).join("")}
      </div>
      <div>
        <div class="label" style="margin-bottom:4px;">Details</div>
        <div>Expected: ${po.expectedAt ? escapeHtml(new Date(po.expectedAt).toLocaleDateString("en-GB")) : "—"}</div>
        <div>Received: ${po.receivedAt ? escapeHtml(new Date(po.receivedAt).toLocaleDateString("en-GB")) : "—"}</div>
        ${po.createdBy ? `<div>Raised by ${escapeHtml(po.createdBy)}</div>` : ""}
        <div style="margin-top:8px;">${totalUnits} unit${totalUnits === 1 ? "" : "s"} across ${po.items.length} line${po.items.length === 1 ? "" : "s"}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="r">Qty</th>
          <th class="r">Unit cost</th>
          <th class="r">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div class="row"><span style="color:#555">Lines total</span><span>${moneyForPrint(linesTotal)}</span></div>
      <div class="sep"></div>
      <div class="row grand"><span>Total</span><span>${moneyForPrint(po.total)}</span></div>
    </div>

    ${po.notes ? `<div class="notes"><div class="label" style="margin-bottom:4px;">Notes</div>${escapeHtml(po.notes)}</div>` : ""}

    <div class="signs">
      <div><div class="sig-line"></div>Authorised by</div>
      <div><div class="sig-line"></div>Received by</div>
    </div>

    <div class="foot">Generated by MZR Parts admin · ${escapeHtml(po.poNumber)}</div>
  </div></body></html>`;
}

function printPoInIframe(po: PORow) {
  const html = buildPoHtml(po);
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });
  document.body.appendChild(iframe);
  iframe.srcdoc = html;
  iframe.addEventListener("load", () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("[po print]", e);
    }
    setTimeout(() => iframe.remove(), 1500);
  });
}
