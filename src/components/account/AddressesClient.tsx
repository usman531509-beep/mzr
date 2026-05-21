"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2, Home, Loader2, MapPin, Pencil, Plus, Star, Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export type AddressRow = {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  county: string | null;
  postcode: string;
  country: string;
  isDefault: boolean;
};

export function AddressesClient({ initial }: { initial: AddressRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AddressRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const setDefault = async (a: AddressRow) => {
    if (a.isDefault) return;
    setBusyId(a.id);
    try {
      const res = await fetch(`/api/account/addresses/${a.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Could not set default");
        return;
      }
      toast.success("Default address updated");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const del = async (a: AddressRow) => {
    if (!confirm(`Delete "${a.label || a.recipientName}"?`)) return;
    setBusyId(a.id);
    try {
      const res = await fetch(`/api/account/addresses/${a.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Could not delete");
        return;
      }
      toast.success("Address deleted");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> New address
        </Button>
      </div>

      {initial.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <MapPin className="h-6 w-6" />
            No saved addresses yet. Add one and we&apos;ll pre-fill the
            checkout form for you.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {initial.map((a) => (
            <Card key={a.id} className={a.isDefault ? "border-primary/40" : ""}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {a.label ? (
                      <span className="font-semibold">{a.label}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Home className="h-3.5 w-3.5" /> Address
                      </span>
                    )}
                    {a.isDefault && (
                      <Badge className="gap-1 bg-primary/15 text-primary ring-1 ring-inset ring-primary/30 hover:bg-primary/15">
                        <Star className="h-3 w-3" /> Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => setEditing(a)}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => del(a)}
                      disabled={busyId === a.id}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-0.5 text-sm">
                  <div className="font-medium">{a.recipientName}</div>
                  <div>{a.line1}</div>
                  {a.line2 && <div>{a.line2}</div>}
                  <div>
                    {a.city}
                    {a.county ? `, ${a.county}` : ""}
                  </div>
                  <div className="font-mono text-xs">{a.postcode}</div>
                  <div className="text-muted-foreground">{a.country}</div>
                  {a.phone && (
                    <div className="pt-1 text-[11px] text-muted-foreground">{a.phone}</div>
                  )}
                </div>

                {!a.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => setDefault(a)}
                    disabled={busyId === a.id}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Make default
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddressDialog
        key={creating ? "create" : (editing?.id ?? "closed")}
        open={creating || !!editing}
        address={editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
      />
    </div>
  );
}

function AddressDialog({
  open, address, onClose, onSaved,
}: {
  open: boolean;
  address: AddressRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!address;
  const [form, setForm] = useState({
    label:         address?.label         ?? "",
    recipientName: address?.recipientName ?? "",
    phone:         address?.phone         ?? "",
    line1:         address?.line1         ?? "",
    line2:         address?.line2         ?? "",
    city:          address?.city          ?? "",
    county:        address?.county        ?? "",
    postcode:      address?.postcode      ?? "",
    country:       address?.country       ?? "United Kingdom",
    isDefault:     address?.isDefault     ?? false,
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipientName.trim() || !form.line1.trim() || !form.city.trim() ||
        !form.postcode.trim() || !form.country.trim()) {
      toast.error("Please fill in the required fields");
      return;
    }
    setBusy(true);
    try {
      const url = isEdit ? `/api/account/addresses/${address!.id}` : "/api/account/addresses";
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
      toast.success(isEdit ? "Address updated" : "Address saved");
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit address" : "New address"}</DialogTitle>
          <DialogDescription>
            Used to pre-fill the checkout form. The default address is the one
            we pick first.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Label (optional)" full>
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Home, Work, Mum's house"
              maxLength={60}
            />
          </Field>
          <Field label="Recipient name *" full>
            <Input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} required />
          </Field>
          <Field label="Phone (optional)" full>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07xxx xxxxxx" />
          </Field>
          <Field label="Address line 1 *" full>
            <Input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} placeholder="House number and street" required />
          </Field>
          <Field label="Address line 2 (optional)" full>
            <Input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} placeholder="Apartment, suite, building" />
          </Field>
          <Field label="Town / City *">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
          </Field>
          <Field label="County (optional)">
            <Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} placeholder="e.g. Greater London" />
          </Field>
          <Field label="Postcode *">
            <Input
              value={form.postcode}
              onChange={(e) => setForm({ ...form, postcode: e.target.value.toUpperCase() })}
              placeholder="SW1A 1AA"
              autoComplete="postal-code"
              required
            />
          </Field>
          <Field label="Country *">
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required />
          </Field>

          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            <span>Set as default shipping address</span>
          </label>

          <DialogFooter className="col-span-2 flex-row gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Save changes" : "Save address"}
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
