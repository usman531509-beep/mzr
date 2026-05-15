"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

type Row = {
  id: string;
  name: string;
  slug: string;
  trackingUrl: string;
  logoUrl: string | null;
  active: boolean;
  orderCount: number;
};

export function CouriersClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete courier "${name}"?`)) return;
    const res = await fetch(`/api/admin/couriers/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast.error(data.error ?? "Could not delete");
      return;
    }
    toast.success("Courier deleted");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> New courier
        </Button>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Courier</TableHead>
              <TableHead>Tracking page</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-10 text-center text-sm text-muted-foreground">
                  <MapPin className="mx-auto mb-2 h-6 w-6" />
                  No couriers yet — add one to start sending tracking info to customers.
                </TableCell>
              </TableRow>
            ) : rows.map((c) => (
              <TableRow key={c.id} className="align-top">
                <TableCell>
                  <div className="font-medium">{c.name}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{c.slug}</div>
                </TableCell>
                <TableCell className="text-sm">
                  <a
                    href={c.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <span className="line-clamp-1 max-w-[320px] break-all">{c.trackingUrl}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {c.orderCount > 0 ? (
                    <span>{c.orderCount}</span>
                  ) : <span className="text-muted-foreground">0</span>}
                </TableCell>
                <TableCell>
                  <CourierActiveToggle id={c.id} active={c.active} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => del(c.id, c.name)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CourierDialog
        key={creating ? "create" : (editing?.id ?? "closed")}
        open={creating || !!editing}
        courier={editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
      />
    </div>
  );
}

function CourierActiveToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(active);
  const [busy, setBusy] = useState(false);

  const toggle = async (next: boolean) => {
    setOptimistic(next);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/couriers/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      if (!res.ok) {
        setOptimistic(!next);
        toast.error("Could not update courier");
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
      <span className={`text-xs ${optimistic ? "text-emerald-400" : "text-muted-foreground"}`}>
        {optimistic ? "Active" : "Inactive"}
      </span>
    </div>
  );
}

function CourierDialog({
  open, courier, onClose, onSaved,
}: {
  open: boolean;
  courier: Row | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!courier;
  const [form, setForm] = useState({
    name: courier?.name ?? "",
    trackingUrl: courier?.trackingUrl ?? "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const url = isEdit ? `/api/admin/couriers/${courier!.id}` : "/api/admin/couriers";
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
      toast.success(isEdit ? "Courier updated" : "Courier created");
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit courier" : "New courier"}</DialogTitle>
          <DialogDescription>
            The tracking URL is the carrier&apos;s public tracking page. Customers will be linked here with the tracking number you record on each order.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Name *" full>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="DHL, FedEx, Royal Mail…"
              required
            />
          </Field>
          <Field label="Tracking URL *" full>
            <Input
              type="url"
              value={form.trackingUrl}
              onChange={(e) => setForm({ ...form, trackingUrl: e.target.value })}
              placeholder="https://www.dhl.com/en/express/tracking.html"
              required
            />
          </Field>
          <DialogFooter className="col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Save changes" : "Create courier"}
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
