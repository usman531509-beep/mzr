"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { History, Loader2, Mail, MapPin, Pencil, Phone, Plus, Trash2, Truck } from "lucide-react";
import { confirmAction } from "@/lib/confirm-store";
import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

type POLine = { name: string; quantity: number };
type POSummary = {
  id: string;
  poNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: POLine[];
};

type Row = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  active: boolean;
  poCount: number;
  purchaseOrders: POSummary[];
};

// PO status → reference-theme .st badge modifier.
const PO_STATUS: Record<string, string> = {
  DRAFT:     "muted",
  PLACED:    "info",
  RECEIVED:  "ok",
  CANCELLED: "bad",
};

export function SuppliersClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [history, setHistory] = useState<Row | null>(null);

  const del = async (id: string, name: string) => {
    const ok = await confirmAction({
      title: `Delete supplier "${name}"?`,
      description: "Suppliers with existing purchase orders can't be deleted — those would orphan.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/suppliers/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast.error(data.error ?? "Could not delete");
      return;
    }
    toast.success("Supplier deleted");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button type="button" className="btn-red !px-4 !py-2.5" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> New supplier
        </button>
      </div>

      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Contact</th>
              <th>Location</th>
              <th className="!text-right">POs</th>
              <th>Status</th>
              <th className="!text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="!py-10 !text-center text-muted-foreground">
                  <Truck className="mx-auto mb-2 h-6 w-6" />
                  No suppliers yet.
                </td>
              </tr>
            ) : rows.map((s) => (
              <tr key={s.id} className="align-top">
                <td>
                  <div className="font-semibold">{s.name}</div>
                  {s.notes && <div className="line-clamp-1 text-xs text-muted-foreground">{s.notes}</div>}
                </td>
                <td>
                  <div>{s.contactName ?? "—"}</div>
                  {s.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> {s.email}
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {s.phone}
                    </div>
                  )}
                </td>
                <td className="text-muted-foreground">
                  {[s.city, s.country].filter(Boolean).length > 0 ? (
                    <div className="flex items-start gap-1">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      <div>
                        {s.address && <div>{s.address}</div>}
                        <div>{[s.city, s.country].filter(Boolean).join(", ")}</div>
                      </div>
                    </div>
                  ) : "—"}
                </td>
                <td className="!text-right">
                  {s.poCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setHistory(s)}
                      className="inline-flex items-center gap-1 text-red underline-offset-2 hover:underline"
                    >
                      <History className="h-3 w-3" /> {s.poCount}
                    </button>
                  ) : <span className="text-muted-foreground">0</span>}
                </td>
                <td>
                  <SupplierActiveToggle id={s.id} active={s.active} />
                </td>
                <td className="!text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => del(s.id, s.name)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SupplierDialog
        key={creating ? "create" : (editing?.id ?? "closed")}
        open={creating || !!editing}
        supplier={editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
      />

      <HistoryDialog
        supplier={history}
        onClose={() => setHistory(null)}
      />
    </div>
  );
}

function SupplierActiveToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(active);
  const [busy, setBusy] = useState(false);

  const toggle = async (next: boolean) => {
    setOptimistic(next);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      if (!res.ok) {
        setOptimistic(!next);
        toast.error("Could not update supplier");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Switch checked={optimistic} onCheckedChange={toggle} disabled={busy} />
      <span className={`st ${optimistic ? "ok" : "muted"}`}>
        {optimistic ? "Active" : "Inactive"}
      </span>
    </div>
  );
}

function SupplierDialog({
  open, supplier, onClose, onSaved,
}: {
  open: boolean;
  supplier: Row | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!supplier;
  const [form, setForm] = useState({
    name: supplier?.name ?? "",
    contactName: supplier?.contactName ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    address: supplier?.address ?? "",
    city: supplier?.city ?? "",
    country: supplier?.country ?? "",
    notes: supplier?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const url = isEdit ? `/api/admin/suppliers/${supplier!.id}` : "/api/admin/suppliers";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Could not save");
        return;
      }
      toast.success(isEdit ? "Supplier updated" : "Supplier created");
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit supplier" : "New supplier"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update contact and address details." : "Add a parts vendor with their contact details."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Company name *" full>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Contact name">
            <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Address" full>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="Country">
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </Field>
          <Field label="Notes" full>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <DialogFooter className="col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Save changes" : "Create supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ supplier, onClose }: { supplier: Row | null; onClose: () => void }) {
  if (!supplier) return null;
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            {supplier.name} — purchase history
          </DialogTitle>
          <DialogDescription>
            {supplier.poCount} purchase order{supplier.poCount === 1 ? "" : "s"} on record.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
          {supplier.purchaseOrders.map((po) => (
            <li key={po.id} className="flex items-start gap-3 py-2.5 text-sm">
              <span className="font-mono text-[11px] text-muted-foreground">{po.poNumber}</span>
              <span className={`st ${PO_STATUS[po.status] ?? "muted"}`}>
                {po.status}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] text-muted-foreground">
                  {new Date(po.createdAt).toLocaleString("en-GB")}
                </div>
                <div className="line-clamp-2 text-[12px]">
                  {po.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                </div>
              </div>
              <div className="font-medium tabular-nums">{fmtMoney(po.total)}</div>
            </li>
          ))}
        </ul>
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
