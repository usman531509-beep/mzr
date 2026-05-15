"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardList, Loader2, Trash2 } from "lucide-react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

export type PORow = {
  id: string;
  poNumber: string;
  supplierName: string;
  supplierId: string;
  status: "DRAFT" | "PLACED" | "RECEIVED" | "CANCELLED" | string;
  total: number;
  itemCount: number;
  items: { name: string; quantity: number; unitCost: number }[];
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
  const [open, setOpen] = useState<PORow | null>(null);

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
    if (!confirm(`Delete ${ref}?`)) return;
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
                  onClick={() => setOpen(p)}
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
                <Button
                  variant="ghost" size="icon"
                  onClick={() => del(p.id, p.poNumber)}
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <PoDetailDialog po={open} onClose={() => setOpen(null)} />
    </>
  );
}

function PoDetailDialog({ po, onClose }: { po: PORow | null; onClose: () => void }) {
  if (!po) return null;
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {po.poNumber} <span className="text-muted-foreground">·</span> {po.supplierName}
          </DialogTitle>
          <DialogDescription>
            {new Date(po.createdAt).toLocaleString("en-GB")}
            {po.receivedAt && ` · Received ${new Date(po.receivedAt).toLocaleDateString("en-GB")}`}
          </DialogDescription>
        </DialogHeader>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge className={STATUS_CLASS[po.status] ?? "bg-muted text-muted-foreground"}>
            {po.status}
          </Badge>
          <span className="ml-auto text-lg font-bold tabular-nums">{fmtMoney(po.total)}</span>
        </div>
        <ul className="divide-y divide-border">
          {po.items.map((it, idx) => (
            <li key={idx} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{it.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {fmtMoney(it.unitCost)} × {it.quantity}
                </div>
              </div>
              <div className="font-medium tabular-nums">{fmtMoney(it.unitCost * it.quantity)}</div>
            </li>
          ))}
        </ul>
        {po.notes && (
          <div className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest">Notes</div>
            {po.notes}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
