"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const ROLES = ["USER", "STAFF", "MANAGER", "ADMIN"] as const;

export type EditableUser = {
  id: string;
  name: string | null;
  email: string;
  role: typeof ROLES[number];
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
};

export function UserDialog({
  open, onOpenChange, user, isSelf,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  // null → create mode; otherwise edit mode for the given user.
  user: EditableUser | null;
  isSelf?: boolean;
}) {
  const router = useRouter();
  const isEdit = !!user;

  const [form, setForm] = useState(() => ({
    name:     user?.name ?? "",
    email:    user?.email ?? "",
    phone:    user?.phone ?? "",
    address:  user?.address ?? "",
    city:     user?.city ?? "",
    country:  user?.country ?? "",
    role:     user?.role ?? "USER",
    password: "",
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const url = isEdit ? `/api/admin/users/${user!.id}` : "/api/admin/users";
      const method = isEdit ? "PATCH" : "POST";

      // For edit: only send password if the admin actually typed one.
      const payload: Record<string, unknown> = {
        name: form.name || null,
        email: form.email,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        country: form.country || null,
        role: form.role,
      };
      if (!isEdit) {
        payload.password = form.password;
      } else if (form.password) {
        payload.password = form.password;
      }

      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const msg = data.error ?? `Server returned ${res.status}`;
        setErr(msg);
        toast.error(msg);
        return;
      }
      toast.success(isEdit ? "User updated" : "User created");
      onOpenChange(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit user" : "New user"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the user's details, role, or set a new password."
              : "Create a new staff, manager, or customer account."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="mb-1.5 block text-xs">Full name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Role *</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm({ ...form, role: v as typeof ROLES[number] })}
              disabled={isSelf}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSelf && (
              <p className="mt-1 text-[11px] text-muted-foreground">You can&apos;t change your own role.</p>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">City</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label className="mb-1.5 block text-xs">Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Country</Label>
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <div className="col-span-2 border-t border-border pt-3">
            <Label className="mb-1.5 block text-xs">
              Password {isEdit ? <span className="text-muted-foreground">(leave blank to keep current)</span> : "*"}
            </Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!isEdit}
              minLength={8}
              placeholder={isEdit ? "Leave empty to keep current password" : "At least 8 characters"}
            />
          </div>

          {err && <p className="col-span-2 text-sm text-destructive">{err}</p>}

          <DialogFooter className="col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
