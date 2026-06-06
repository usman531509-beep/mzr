"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Initial = {
  name: string | null; email: string;
  phone: string | null;
  // Full UK postal address — matches the trade-account request shape so
  // approved trader profiles read consistently across the app.
  address: string | null;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
};

export function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial.name ?? "",
    phone: initial.phone ?? "",
    address: initial.address ?? "",
    addressLine2: initial.addressLine2 ?? "",
    city: initial.city ?? "",
    county: initial.county ?? "",
    postcode: initial.postcode ?? "",
    // Default to UK so brand-new accounts land with the country pre-filled
    // — matches the trade-account form's default and the checkout flow.
    country: initial.country ?? "United Kingdom",
  });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [busy, setBusy] = useState(false);

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Details saved");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Failed to save");
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 6) return toast.error("New password must be at least 6 characters");
    setBusy(true);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Password updated");
      setPw({ current: "", next: "" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Failed to update password");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your details and password.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal details</CardTitle>
          <CardDescription>Name, contact, default shipping address.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveDetails} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={initial.email} disabled />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            {/* Default shipping address — full UK postal layout. Used at
                checkout when the customer hasn't picked a saved address. */}
            <div className="space-y-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold">Default shipping address</h3>
                <p className="text-[12px] text-muted-foreground">
                  Pre-fills at checkout. You can still pick a different one from your saved addresses below.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Address line 1</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="House number / street"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>
                    Address line 2 <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    value={form.addressLine2}
                    onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                    placeholder="Apartment, suite, etc."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>City / Town</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    County <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Postcode</Label>
                  <Input
                    value={form.postcode}
                    onChange={(e) => setForm({ ...form, postcode: e.target.value.toUpperCase() })}
                    placeholder="e.g. SW1A 1AA"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Password</CardTitle>
          <CardDescription>Use a strong password — 6 characters minimum.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Current password</Label>
                <Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>New password</Label>
                <Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={6} />
              </div>
            </div>
            <Separator />
            <div className="flex justify-end">
              <Button type="submit" disabled={busy} variant="outline">Update password</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
