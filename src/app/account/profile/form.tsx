"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
    <div>
      <header style={{ marginBottom: 22 }}>
        <h1 className="font-head text-3xl uppercase leading-none tracking-[0.02em]" style={{ margin: 0 }}>
          Profile
        </h1>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>
          Manage your details and password.
        </p>
      </header>

      <div className="panel">
        <h3>Personal details</h3>
        <p className="muted" style={{ margin: "-8px 0 14px", fontSize: 13 }}>
          Name, contact, default shipping address.
        </p>
        <form onSubmit={saveDetails}>
          <div className="grid g-2">
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={initial.email} disabled style={{ background: "var(--soft)", color: "var(--muted)" }} />
            </div>
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          <div className="hr" />

          {/* Default shipping address — full UK postal layout. Used at
              checkout when the customer hasn't picked a saved address. */}
          <h4 style={{ margin: "0 0 4px", fontSize: 14 }}>Default shipping address</h4>
          <p className="muted" style={{ margin: "0 0 14px", fontSize: 13 }}>
            Pre-fills at checkout. You can still pick a different one from your saved addresses below.
          </p>
          <div className="field">
            <label>Address line 1</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="House number / street"
            />
          </div>
          <div className="field">
            <label>Address line 2 <span className="muted">(optional)</span></label>
            <input
              value={form.addressLine2}
              onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
              placeholder="Apartment, suite, etc."
            />
          </div>
          <div className="grid g-2">
            <div className="field">
              <label>City / Town</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="field">
              <label>County <span className="muted">(optional)</span></label>
              <input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
            </div>
            <div className="field">
              <label>Postcode</label>
              <input
                value={form.postcode}
                onChange={(e) => setForm({ ...form, postcode: e.target.value.toUpperCase() })}
                placeholder="e.g. SW1A 1AA"
              />
            </div>
            <div className="field">
              <label>Country</label>
              <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-red disabled:opacity-60" disabled={busy}>
              Save changes
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h3>Password</h3>
        <p className="muted" style={{ margin: "-8px 0 14px", fontSize: 13 }}>
          Use a strong password — 6 characters minimum.
        </p>
        <form onSubmit={savePassword}>
          <div className="grid g-2">
            <div className="field">
              <label>Current password</label>
              <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
            </div>
            <div className="field">
              <label>New password</label>
              <input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={6} />
            </div>
          </div>
          <div className="hr" />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-ghost disabled:opacity-60" disabled={busy}>
              Update password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
