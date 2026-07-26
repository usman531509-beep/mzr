"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MapPin, CheckCircle2, Clock, XCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ROLES = ["USER", "STAFF", "MANAGER", "ADMIN"] as const;

// Read-only view of the most recent trade-account application. PartDialog
// for the admin → mirrors the fields the trade-account form captures so
// admins don't have to bounce between this dialog and /admin/trade-requests
// to see what the customer submitted.
export type TradeRequestView = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  // Contact block
  contactName: string;
  email: string;
  phone: string | null;
  // Business block
  companyName: string;
  companyWebsite: string | null;
  vatNumber: string | null;
  businessType: string | null;
  monthlyVolume: string | null;
  // UK postal address
  address: string;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  notes: string | null;
};

// One entry from the customer's saved address book. Surfaced read-only in
// the dialog — full CRUD lives on the customer's own account page.
export type SavedAddressView = {
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

export type EditableUser = {
  id: string;
  name: string | null;
  email: string;
  role: typeof ROLES[number];
  phone: string | null;
  // Full UK postal address — matches the trade-account request shape and
  // the customer-side profile form. `address` is line 1.
  address: string | null;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  // Auth + trade state — defaulted by the parent (older callers can still
  // pass the basic fields above; these get sensible fallbacks).
  active?: boolean;
  tradeApproved?: boolean;
  tradeApprovedAt?: string | null;
  mustChangePassword?: boolean;
  createdAt?: string;
  // Optional rich profile — empty arrays / null when the parent hasn't
  // fetched them or the user has none.
  tradeRequest?: TradeRequestView | null;
  addresses?: SavedAddressView[];
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
    name:         user?.name ?? "",
    email:        user?.email ?? "",
    phone:        user?.phone ?? "",
    address:      user?.address ?? "",
    addressLine2: user?.addressLine2 ?? "",
    city:         user?.city ?? "",
    county:       user?.county ?? "",
    postcode:     user?.postcode ?? "",
    country:      user?.country ?? "",
    role:         user?.role ?? "USER",
    password:     "",
    tradeApproved:     user?.tradeApproved ?? false,
    mustChangePassword: user?.mustChangePassword ?? false,
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

      const payload: Record<string, unknown> = {
        name: form.name || null,
        email: form.email,
        phone: form.phone || null,
        address: form.address || null,
        addressLine2: form.addressLine2 || null,
        city: form.city || null,
        county: form.county || null,
        postcode: form.postcode || null,
        country: form.country || null,
        role: form.role,
      };
      if (!isEdit) {
        payload.password = form.password;
        // On create, send the trade flag if the admin ticked it. The
        // POST handler stamps tradeApprovedAt automatically.
        if (form.tradeApproved) payload.tradeApproved = true;
      } else if (form.password) {
        payload.password = form.password;
      }
      if (isEdit) {
        // Only send the auth/trade booleans on edit so create-mode payload
        // stays clean. The PATCH handler only mutates when these change.
        if (form.tradeApproved !== (user?.tradeApproved ?? false)) {
          payload.tradeApproved = form.tradeApproved;
        }
        if (form.mustChangePassword !== (user?.mustChangePassword ?? false)) {
          payload.mustChangePassword = form.mustChangePassword;
        }
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

  const hasTradeData = !!user?.tradeRequest;
  const addressCount = user?.addresses?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto !duration-75">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit user" : "New user"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Profile, trade-account status, and saved addresses  all editable from one place."
              : "Create a new staff, manager, or customer account."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {isEdit ? (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="trade">
                  Trade {hasTradeData && <span className="ml-1.5 text-[10px] opacity-70">·</span>}
                  {hasTradeData && <span className="ml-1 text-[10px]">1</span>}
                </TabsTrigger>
                <TabsTrigger value="addresses">
                  Addresses
                  {addressCount > 0 && <span className="ml-1.5 text-[10px] opacity-70">·</span>}
                  {addressCount > 0 && <span className="ml-1 text-[10px]">{addressCount}</span>}
                </TabsTrigger>
              </TabsList>

              {/* PROFILE — name, email, role, contact, password, auth flags */}
              <TabsContent value="profile" className="space-y-4 pt-4">
                <ProfileFields
                  form={form}
                  setForm={setForm}
                  isEdit
                  isSelf={!!isSelf}
                />
              </TabsContent>

              {/* TRADE — read-only view of latest submission + approval toggle */}
              <TabsContent value="trade" className="space-y-3 pt-4">
                <TradeTab
                  user={user!}
                  approved={form.tradeApproved}
                  onChange={(v) => setForm({ ...form, tradeApproved: v })}
                />
              </TabsContent>

              {/* ADDRESSES — read-only list of the customer's saved address book */}
              <TabsContent value="addresses" className="space-y-3 pt-4">
                <AddressesTab addresses={user!.addresses ?? []} />
              </TabsContent>
            </Tabs>
          ) : (
            // CREATE MODE — single panel, no tabs (the trade + address tabs
            // need a saved user to be useful).
            <ProfileFields form={form} setForm={setForm} isEdit={false} isSelf={false} />
          )}

          {err && <p className="text-sm text-destructive">{err}</p>}

          <DialogFooter>
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

// ─────────────────────────────────────────────────────────────────────────────
// Profile tab body — kept in its own component so create-mode and edit-mode
// can share the exact same fields without duplicating markup.

type FormState = {
  name: string; email: string; phone: string;
  // Full UK postal shape — `address` is line 1, the rest mirror the
  // customer profile + trade-account form fields.
  address: string; addressLine2: string;
  city: string; county: string; postcode: string; country: string;
  role: typeof ROLES[number]; password: string;
  tradeApproved: boolean; mustChangePassword: boolean;
};

function ProfileFields({
  form, setForm, isEdit, isSelf,
}: {
  form: FormState;
  setForm: (next: FormState) => void;
  isEdit: boolean;
  isSelf: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
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

      {/* Create-mode shortcut: turn the new account into a trader on
          create. In edit mode the full Trade tab handles this; here we
          surface it inline so onboarding a known wholesale customer
          doesn't need a second round-trip. */}
      {!isEdit && (
        <div className="col-span-2 rounded-md border border-border bg-card p-3">
          <label className="flex items-start gap-3">
            <Checkbox
              checked={form.tradeApproved}
              onCheckedChange={(v) => setForm({ ...form, tradeApproved: !!v })}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Create as a trader account</div>
              <p className="text-[11px] text-muted-foreground">
                Marks the new user as trade-approved on the spot — category trade discounts apply automatically at checkout. Skip this for regular customers.
              </p>
            </div>
          </label>
        </div>
      )}

      {/* UK postal address. Trade approvals seed these from the
          application's business address — the admin can override here. */}
      <div className="col-span-2">
        <Label className="mb-1.5 block text-xs">Address line 1</Label>
        <Input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="House number / street"
        />
      </div>
      <div className="col-span-2">
        <Label className="mb-1.5 block text-xs">
          Address line 2 <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          value={form.addressLine2}
          onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
          placeholder="Apartment, suite, etc."
        />
      </div>
      <div>
        <Label className="mb-1.5 block text-xs">City / Town</Label>
        <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </div>
      <div>
        <Label className="mb-1.5 block text-xs">
          County <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
      </div>
      <div>
        <Label className="mb-1.5 block text-xs">Postcode</Label>
        <Input
          value={form.postcode}
          onChange={(e) => setForm({ ...form, postcode: e.target.value.toUpperCase() })}
          placeholder="e.g. SW1A 1AA"
        />
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
        {isEdit && (
          <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={form.mustChangePassword}
              onCheckedChange={(v) => setForm({ ...form, mustChangePassword: !!v })}
            />
            Require this user to change their password on next sign-in
          </label>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Trade tab body — read-only view of the latest TradeAccountRequest +
// admin-controlled approval toggle.

function TradeTab({
  user, approved, onChange,
}: {
  user: EditableUser;
  approved: boolean;
  onChange: (v: boolean) => void;
}) {
  const req = user.tradeRequest;

  return (
    <div className="space-y-4">
      {/* Approval card sits at the top regardless of whether there's a
          submitted application, so admins can flip a user to trader on the
          spot (e.g. for VIPs who bypass the form). */}
      <div className="rounded-md border border-border bg-card p-3">
        <label className="flex items-start gap-3">
          <Checkbox
            checked={approved}
            onCheckedChange={(v) => onChange(!!v)}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Approved for trade pricing</div>
            <p className="text-[12px] text-muted-foreground">
              When ticked, category trade discounts apply automatically at checkout.
              {user.tradeApprovedAt && (
                <> Originally approved on {new Date(user.tradeApprovedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}.</>
              )}
            </p>
          </div>
        </label>
      </div>

      {req ? (
        <div className="space-y-3 rounded-md border border-border bg-card/40 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Trade application</div>
              <p className="text-[11px] text-muted-foreground">
                Submitted {new Date(req.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                {req.decidedAt && (
                  <> · decided {new Date(req.decidedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</>
                )}
              </p>
            </div>
            <StatusBadge status={req.status} />
          </div>

          <FieldGrid
            rows={[
              ["Contact name", req.contactName],
              ["Email", req.email],
              ["Phone", req.phone],
              ["Company", req.companyName],
              ["Business type", req.businessType],
              ["Monthly volume", req.monthlyVolume],
              ["VAT number", req.vatNumber],
              ["Website", req.companyWebsite],
            ]}
          />

          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Business address
            </div>
            <div className="text-sm leading-relaxed">
              {[req.address, req.addressLine2, req.city, req.county, req.postcode, req.country]
                .filter(Boolean)
                .join(", ")}
            </div>
          </div>

          {req.notes && (
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Notes from applicant
              </div>
              <div className="rounded border border-border bg-background/40 p-2 text-sm leading-relaxed whitespace-pre-wrap">
                {req.notes}
              </div>
            </div>
          )}

          {req.decisionNote && (
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Decision note
              </div>
              <div className="rounded border border-border bg-background/40 p-2 text-sm leading-relaxed whitespace-pre-wrap">
                {req.decisionNote}
              </div>
            </div>
          )}

          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/admin/trade-requests" target="_blank">
              <ExternalLink className="h-3.5 w-3.5" /> Manage in Trade Requests
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No trade application on file. You can still approve this user manually using the checkbox above.
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: TradeRequestView["status"] }) {
  if (status === "APPROVED") {
    return (
      <span className="st ok whitespace-nowrap">
        <CheckCircle2 className="mr-1 inline h-3 w-3 align-[-2px]" /> Approved
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="st bad whitespace-nowrap">
        <XCircle className="mr-1 inline h-3 w-3 align-[-2px]" /> Rejected
      </span>
    );
  }
  return (
    <span className="st warn whitespace-nowrap">
      <Clock className="mr-1 inline h-3 w-3 align-[-2px]" /> Pending
    </span>
  );
}

// Lightweight read-only field grid used inside the trade tab. Skips rows
// whose value is empty so the dialog doesn't show a wall of blank fields
// for sparse applications.
function FieldGrid({ rows }: { rows: [string, string | null | undefined][] }) {
  const filled = rows.filter(([, v]) => v && String(v).trim().length > 0);
  if (filled.length === 0) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      {filled.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
          <dd className="truncate font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Addresses tab — read-only view of the customer's saved address book.
// Edit/delete is intentionally not surfaced here: addresses are user-owned
// state managed from their account page, and giving admins write access
// would muddy that ownership boundary. We can flip this open later if a
// support-driven need emerges.

function AddressesTab({ addresses }: { addresses: SavedAddressView[] }) {
  if (addresses.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No saved addresses. Addresses appear here when the customer adds them on their account page.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {addresses.map((a) => (
        <li
          key={a.id}
          className="rounded-md border border-border bg-card/40 p-3"
        >
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {a.recipientName}
                </span>
                {a.label && (
                  <Badge variant="secondary" className="text-[10px]">{a.label}</Badge>
                )}
                {a.isDefault && (
                  <Badge variant="default" className="text-[10px]">Default</Badge>
                )}
              </div>
              <div className="mt-1 text-sm leading-relaxed text-foreground/85">
                {[a.line1, a.line2, a.city, a.county, a.postcode, a.country]
                  .filter(Boolean)
                  .join(", ")}
              </div>
              {a.phone && (
                <div className="mt-0.5 text-xs text-muted-foreground">{a.phone}</div>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
