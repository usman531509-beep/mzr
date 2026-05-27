"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Eye, ExternalLink, FileText, Pencil, Plus, Printer, Search, ShieldCheck, Truck, X } from "lucide-react";

import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableHead, TableRow, TableBody, TableCell,
} from "@/components/ui/table";
import { fmtMoney } from "@/lib/format";

type OrderRow = {
  id: string;
  orderNumber: string | null;
  status: string;
  total: number;
  shippingFee: number;
  discount: number;
  customer: string;
  email: string;
  phone: string;
  address: string;
  shippingAddress: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingCounty: string;
  shippingPostcode: string;
  shippingCountry: string;
  notes: string;
  courierId: string | null;
  courierName: string | null;
  courierTrackingUrl: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  items: {
    name: string;
    qty: number;
    price: number;
    brand: string | null;
    sku: string | null;
    oem: string | null;
    fitments: { brand: string; model: string; yearFrom: number; yearTo: number }[];
  }[];
  createdAt: string;
  createdByAdmin: string | null;
  paymentToken: string | null;
};

type CourierOption = { id: string; name: string; trackingUrl: string };

const STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

const STATUS_TRIGGER: Record<string, string> = {
  PENDING:   "border-amber-500/40 text-amber-300",
  PAID:      "border-blue-500/40 text-blue-300",
  SHIPPED:   "border-indigo-500/40 text-indigo-300",
  DELIVERED: "border-emerald-500/40 text-emerald-300",
  CANCELLED: "border-rose-500/40 text-rose-300",
};

export function OrdersClient({
  initial,
  couriers,
  pagination,
}: {
  initial: OrderRow[];
  couriers: CourierOption[];
  pagination: { page: number; pageSize: number; total: number };
}) {
  const router = useRouter();
  const [open, setOpen] = useState<OrderRow | null>(null);
  const [amending, setAmending] = useState<OrderRow | null>(null);
  const [shipping, setShipping] = useState<OrderRow | null>(null);
  const [invoice, setInvoice] = useState<{ order: OrderRow; autoprint: boolean } | null>(null);
  const [payCopied, setPayCopied] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return initial.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!s) return true;
      return (
        o.id.toLowerCase().includes(s) ||
        o.customer.toLowerCase().includes(s) ||
        o.email.toLowerCase().includes(s) ||
        o.phone.toLowerCase().includes(s)
      );
    });
  }, [initial, q, statusFilter]);

  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Order set to ${status}`);
      router.refresh();
    } else toast.error("Failed to update status");
  };

  // Status changes funnel through here so we can intercept SHIPPED and collect
  // a courier + tracking number before hitting the API.
  const handleStatusChange = (order: OrderRow, next: string) => {
    if (next === order.status) return;
    if (next === "SHIPPED" && order.status !== "SHIPPED") {
      if (couriers.length === 0) {
        toast.error("Add a courier first under Shipping → Couriers");
        return;
      }
      setShipping(order);
      return;
    }
    setStatus(order.id, next);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {initial.length} orders
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/orders/new">
            <Plus className="h-3.5 w-3.5" /> New order
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search id, customer, email, phone…"
            className="h-9 pl-8 pr-8"
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  {initial.length === 0 ? "No orders yet." : "No orders match these filters."}
                </TableCell></TableRow>
              ) : filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.orderNumber ?? `${o.id.slice(0, 8)}…`}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{o.customer}</span>
                      {o.createdByAdmin && (
                        <Badge className="gap-1 bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-500/30 hover:bg-blue-500/15">
                          <ShieldCheck className="h-3 w-3" /> By admin
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{o.email}</div>
                    {o.createdByAdmin && (
                      <div className="text-[10px] text-muted-foreground">via {o.createdByAdmin}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{new Date(o.createdAt).toLocaleDateString("en-GB")}</TableCell>
                  <TableCell>
                    <Select value={o.status} onValueChange={(v) => handleStatusChange(o, v)}>
                      <SelectTrigger className={`h-8 w-[140px] border ${STATUS_TRIGGER[o.status] ?? ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {o.status === "SHIPPED" && o.trackingNumber && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Truck className="h-3 w-3" />
                        <span className="truncate max-w-[110px]">{o.courierName ?? "Courier"} · {o.trackingNumber}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmtMoney(o.total)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(o)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            total={pagination.total}
            pageSize={pagination.pageSize}
            currentPage={pagination.page}
            className="px-3 pb-2"
          />
        </CardContent>
      </Card>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>Order {open.orderNumber ?? `#${open.id.slice(0, 8)}`}</SheetTitle>
                <SheetDescription>{new Date(open.createdAt).toLocaleString("en-GB")}</SheetDescription>
              </SheetHeader>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setInvoice({ order: open, autoprint: false })}>
                  <FileText className="h-3.5 w-3.5" /> View invoice
                </Button>
                <Button size="sm" variant="outline" onClick={() => setInvoice({ order: open, autoprint: true })}>
                  <Printer className="h-3.5 w-3.5" /> Print invoice
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAmending(open)}>
                  <Pencil className="h-3.5 w-3.5" /> Amend
                </Button>
              </div>

              <div className="mt-5 space-y-5">
                <div className="flex items-center justify-between">
                  <OrderStatusBadge status={open.status} />
                  <div className="text-lg font-bold">{fmtMoney(open.total)}</div>
                </div>

                <Separator />

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items</h3>
                  <ul className="space-y-2">
                    {open.items.map((i, idx) => (
                      <li key={idx} className="rounded-md border border-border p-2 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium">
                              {i.name} <span className="text-muted-foreground">× {i.qty}</span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                              {i.brand && <span>{i.brand}</span>}
                              {i.sku && <span className="font-mono">SKU {i.sku}</span>}
                              {i.oem && <span className="font-mono">OEM {i.oem}</span>}
                            </div>
                            {i.fitments.length > 0 && (
                              <div className="mt-1 text-[11px] text-muted-foreground">
                                <span className="font-semibold uppercase tracking-wider opacity-70">Fits:</span>{" "}
                                {i.fitments.slice(0, 3).map((f, fi) =>
                                  `${fi > 0 ? " · " : ""}${f.brand} ${f.model} (${f.yearFrom === f.yearTo ? f.yearFrom : `${f.yearFrom}–${f.yearTo}`})`,
                                ).join("")}
                                {i.fitments.length > 3 && <> +{i.fitments.length - 3} more</>}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right tabular-nums">
                            <div>{fmtMoney(i.price * i.qty)}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {fmtMoney(i.price)} ea
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                <Separator />

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shipping</h3>
                  <div className="rounded-md border border-border p-3 text-sm">
                    <div className="font-medium">{open.customer}</div>
                    <div className="text-muted-foreground">{open.email}</div>
                    <div className="text-muted-foreground">{open.phone}</div>
                    <div className="mt-2 text-muted-foreground">
                      <div>{open.shippingAddress}</div>
                      {open.shippingAddressLine2 && <div>{open.shippingAddressLine2}</div>}
                      <div>
                        {open.shippingCity}
                        {open.shippingCounty ? `, ${open.shippingCounty}` : ""}
                      </div>
                      {open.shippingPostcode && (
                        <div className="font-mono">{open.shippingPostcode}</div>
                      )}
                      <div>{open.shippingCountry}</div>
                    </div>
                  </div>
                </section>

                {open.paymentToken && open.status === "PENDING" && (
                  <>
                    <Separator />
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Payment link
                      </h3>
                      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                        <div className="mb-2 text-xs text-muted-foreground">
                          Share this link with the customer so they can pay via
                          Stripe. The link is also visible to them inside their
                          account portal.
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            readOnly
                            value={`${typeof window === "undefined" ? "" : window.location.origin}/pay/${open.paymentToken}`}
                            onFocus={(e) => e.currentTarget.select()}
                            className="h-8 font-mono text-xs"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  `${window.location.origin}/pay/${open.paymentToken}`,
                                );
                                setPayCopied(true);
                                toast.success("Payment link copied");
                                setTimeout(() => setPayCopied(false), 1800);
                              } catch {
                                toast.error("Could not copy — select the link manually");
                              }
                            }}
                          >
                            {payCopied
                              ? <Check className="h-3.5 w-3.5" />
                              : <Copy className="h-3.5 w-3.5" />}
                            {payCopied ? "Copied" : "Copy"}
                          </Button>
                          <Button asChild size="sm" variant="ghost">
                            <a
                              href={`/pay/${open.paymentToken}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Open
                            </a>
                          </Button>
                        </div>
                      </div>
                    </section>
                  </>
                )}

                <Separator />

                {open.status === "SHIPPED" && open.trackingNumber && (
                  <>
                    <Separator />
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tracking</h3>
                      <div className="rounded-md border border-border p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium">{open.courierName ?? "Courier"}</div>
                            <div className="font-mono text-xs text-muted-foreground">{open.trackingNumber}</div>
                            {open.shippedAt && (
                              <div className="mt-0.5 text-[11px] text-muted-foreground">
                                Shipped {new Date(open.shippedAt).toLocaleString("en-GB")}
                              </div>
                            )}
                          </div>
                          {open.courierTrackingUrl && (() => {
                            const n = encodeURIComponent(open.trackingNumber ?? "");
                            const base = open.courierTrackingUrl;
                            const href = n
                              ? (base.endsWith("/") ? `${base}${n}` : `${base}/${n}`)
                              : base;
                            return (
                              <Button asChild size="sm" variant="outline">
                                <a href={href} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5" /> Open
                                </a>
                              </Button>
                            );
                          })()}
                        </div>
                        <div className="mt-2">
                          <Button size="sm" variant="ghost" onClick={() => setShipping(open)}>
                            <Pencil className="h-3.5 w-3.5" /> Edit tracking
                          </Button>
                        </div>
                      </div>
                    </section>
                  </>
                )}

                <Separator />

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Update status</h3>
                  <Select
                    value={open.status}
                    onValueChange={(v) => {
                      if (v === "SHIPPED" && open.status !== "SHIPPED") {
                        if (couriers.length === 0) {
                          toast.error("Add a courier first under Shipping → Couriers");
                          return;
                        }
                        setShipping(open);
                        return;
                      }
                      setStatus(open.id, v);
                      setOpen({ ...open, status: v });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ShippingDialog
        key={shipping?.id ?? "no-ship"}
        order={shipping}
        couriers={couriers}
        onClose={() => setShipping(null)}
        onSaved={() => {
          setShipping(null);
          // Close detail sheet so the refreshed data is fetched cleanly when
          // re-opened.
          setOpen(null);
          router.refresh();
        }}
      />

      <AmendDialog
        order={amending}
        onClose={() => setAmending(null)}
        onSaved={() => { setAmending(null); router.refresh(); }}
      />

      <InvoiceDialog
        state={invoice}
        onClose={() => setInvoice(null)}
      />
    </div>
  );
}

function AmendDialog({
  order, onClose, onSaved,
}: {
  order: OrderRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    customerName: "", customerEmail: "", customerPhone: "",
    shippingAddress: "",       // line 1
    shippingAddressLine2: "",
    shippingCity: "",
    shippingCounty: "",
    shippingPostcode: "",
    shippingCountry: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);

  // Re-seed when a different order is opened.
  useMemo(() => {
    if (order) {
      setForm({
        customerName: order.customer,
        customerEmail: order.email,
        customerPhone: order.phone,
        shippingAddress:      order.shippingAddress,
        shippingAddressLine2: order.shippingAddressLine2,
        shippingCity:         order.shippingCity,
        shippingCounty:       order.shippingCounty,
        shippingPostcode:     order.shippingPostcode,
        shippingCountry:      order.shippingCountry,
        notes: order.notes,
      });
    }
  }, [order]);

  if (!order) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/amend`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Could not amend the order");
        return;
      }
      toast.success("Order amended");
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Amend order {order.orderNumber ?? `#${order.id.slice(0, 8)}`}</DialogTitle>
          <DialogDescription>
            Update the customer or shipping details. Line items are locked once an
            order is placed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Customer name" full><Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required /></Field>
          <Field label="Email"><Input type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} required /></Field>
          <Field label="Phone"><Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} required /></Field>
          <Field label="Address line 1" full><Input value={form.shippingAddress} onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })} placeholder="House number and street" required /></Field>
          <Field label="Address line 2 (optional)" full><Input value={form.shippingAddressLine2} onChange={(e) => setForm({ ...form, shippingAddressLine2: e.target.value })} placeholder="Apartment, suite, building" /></Field>
          <Field label="Town / City"><Input value={form.shippingCity} onChange={(e) => setForm({ ...form, shippingCity: e.target.value })} required /></Field>
          <Field label="County (optional)"><Input value={form.shippingCounty} onChange={(e) => setForm({ ...form, shippingCounty: e.target.value })} placeholder="e.g. Greater London" /></Field>
          <Field label="Postcode"><Input value={form.shippingPostcode} onChange={(e) => setForm({ ...form, shippingPostcode: e.target.value.toUpperCase() })} placeholder="SW1A 1AA" autoComplete="postal-code" required /></Field>
          <Field label="Country"><Input value={form.shippingCountry} onChange={(e) => setForm({ ...form, shippingCountry: e.target.value })} required /></Field>
          <Field label="Notes" full><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <DialogFooter className="col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>Save changes</Button>
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

// ---- Shipping dialog -----------------------------------------------------
//
// Opens when the admin moves an order to SHIPPED, or when they click "Edit
// tracking" on an already-shipped order. Forwards courier + tracking number
// to the existing PATCH endpoint along with status=SHIPPED.

function ShippingDialog({
  order, couriers, onClose, onSaved,
}: {
  order: OrderRow | null;
  couriers: CourierOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [courierId, setCourierId] = useState<string>(order?.courierId ?? couriers[0]?.id ?? "");
  const [trackingNumber, setTrackingNumber] = useState<string>(order?.trackingNumber ?? "");
  const [busy, setBusy] = useState(false);

  if (!order) return null;
  const isEditing = order.status === "SHIPPED";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierId) {
      toast.error("Select a courier");
      return;
    }
    if (!trackingNumber.trim()) {
      toast.error("Enter a tracking number");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "SHIPPED",
          courierId,
          trackingNumber: trackingNumber.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not save shipping info");
        return;
      }
      toast.success(isEditing ? "Tracking updated" : "Order marked as shipped");
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit tracking" : "Mark as shipped"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the courier or tracking number for this shipment."
              : "Pick the courier and enter the tracking number. The customer will see this on their order page."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Courier</Label>
            <Select value={courierId} onValueChange={setCourierId}>
              <SelectTrigger><SelectValue placeholder="Select a courier" /></SelectTrigger>
              <SelectContent>
                {couriers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tracking number</Label>
            <Input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. 1Z999AA10123456784"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              <Truck className="h-3.5 w-3.5" />
              {isEditing ? "Save tracking" : "Mark as shipped"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Invoice (rendered inline in a dialog) -------------------------------

function InvoiceDialog({
  state, onClose,
}: {
  state: { order: OrderRow; autoprint: boolean } | null;
  onClose: () => void;
}) {
  // Fire the iframe print once when this opens with autoprint=true.
  useEffect(() => {
    if (!state?.autoprint) return;
    const t = setTimeout(() => printInvoiceInIframe(state.order), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.order.id, state?.autoprint]);

  if (!state) return null;
  const order = state.order;
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = order.discount ?? 0;
  // Use the persisted shippingFee when available; legacy orders (pre-column)
  // have shippingFee=0 by default, so we fall back to deriving it from the
  // remainder of the total by inverting the VAT formula:
  //   total    = (subtotal + shipping − discount) * 1.20
  // ⇒ shipping = total / 1.20 − subtotal + discount
  const shipping = order.shippingFee > 0
    ? order.shippingFee
    : Math.max(0, +(order.total / 1.20 - subtotal + discount).toFixed(2));
  const taxable = Math.max(0, subtotal + shipping - discount);
  const tax = +(taxable * 0.20).toFixed(2);
  const ref = order.orderNumber ?? order.id;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        {/* Header — leave room on the right for the dialog's built-in X
            close button (shadcn renders one absolutely at top-right). */}
        <DialogHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b border-border bg-card px-5 py-3 pr-14">
          <DialogTitle className="text-sm font-semibold">
            Invoice {ref}
          </DialogTitle>
          <Button size="sm" variant="outline" onClick={() => printInvoiceInIframe(order)}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        </DialogHeader>

        <div id="invoice-print" className="max-h-[80vh] overflow-y-auto bg-white p-8 text-black">
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
                Invoice
              </div>
              <div className="mt-1 font-mono text-lg font-bold tracking-tight">{ref}</div>
              <div className="mt-2 text-xs text-gray-600">
                {new Date(order.createdAt).toLocaleString("en-GB")}
              </div>
              <div className="mt-2 inline-block rounded-full border border-gray-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {order.status}
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-6 rounded-md border border-gray-200 bg-gray-50 p-4 text-xs">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Bill to</div>
              <div className="font-semibold">{order.customer}</div>
              <div className="text-gray-700">{order.email}</div>
              <div className="text-gray-700">{order.phone}</div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Ship to</div>
              <div>{order.shippingAddress}</div>
              {order.shippingAddressLine2 && <div>{order.shippingAddressLine2}</div>}
              <div>
                {order.shippingCity}
                {order.shippingCounty ? `, ${order.shippingCounty}` : ""}
              </div>
              {order.shippingPostcode && <div className="font-mono">{order.shippingPostcode}</div>}
              <div>{order.shippingCountry}</div>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300 text-left text-[11px] uppercase tracking-widest text-gray-500">
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Unit</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, idx) => {
                const metaParts = [
                  it.brand,
                  it.sku ? `SKU ${it.sku}` : null,
                  it.oem ? `OEM ${it.oem}` : null,
                ].filter(Boolean) as string[];
                const fitText = it.fitments.slice(0, 3).map((f) => {
                  const yr = f.yearFrom === f.yearTo ? `${f.yearFrom}` : `${f.yearFrom}–${f.yearTo}`;
                  return `${f.brand} ${f.model} (${yr})`;
                }).join(" · ");
                return (
                  <tr key={idx} className="border-b border-gray-200 align-top">
                    <td className="py-2">
                      <div className="font-semibold">{it.name}</div>
                      {metaParts.length > 0 && (
                        <div className="mt-0.5 text-[11px] text-gray-500">
                          {metaParts.join(" · ")}
                        </div>
                      )}
                      {fitText && (
                        <div className="mt-0.5 text-[11px] text-gray-600">
                          <span className="mr-1 text-[9px] font-bold uppercase tracking-widest text-gray-500">Fits:</span>
                          {fitText}
                          {it.fitments.length > 3 && <> +{it.fitments.length - 3} more</>}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">{it.qty}</td>
                    <td className="py-2 text-right tabular-nums">{fmtMoney(it.price)}</td>
                    <td className="py-2 text-right tabular-nums">{fmtMoney(it.price * it.qty)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="ml-auto mt-4 w-full max-w-sm text-sm">
            <InvoiceRow label="Subtotal" value={fmtMoney(subtotal)} />
            <InvoiceRow label="Shipping" value={shipping === 0 ? "Free" : fmtMoney(shipping)} />
            {discount > 0 && (
              <InvoiceRow label="Discount" value={`−${fmtMoney(discount)}`} />
            )}
            <InvoiceRow label="VAT (20%)" value={fmtMoney(tax)} />
            <div className="my-2 border-t border-gray-300" />
            <InvoiceRow label="Total" value={fmtMoney(order.total)} strong />
          </div>

          {order.notes && (
            <div className="mt-8 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
              <div className="mb-1 font-semibold uppercase tracking-widest text-gray-500">Notes</div>
              {order.notes}
            </div>
          )}

          <div className="mt-10 text-center text-[10px] text-gray-500">
            Thank you for your order — MZR Parts
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between py-1 ${strong ? "text-base font-bold" : ""}`}>
      <span className={strong ? "" : "text-gray-600"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

// ---- Print via hidden iframe ---------------------------------------------
//
// Earlier we hid the rest of the page with `visibility: hidden`, but hidden
// elements still occupy layout space — so the browser printed several blank
// pages for the admin chrome that was technically still flowing. Switching
// to a self-contained iframe sidesteps the issue: only the invoice ends up
// in the print preview, regardless of what the parent page contains.

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function moneyForPrint(n: number): string {
  // fmtMoney returns "£12.34" — we want the same in plain HTML.
  return fmtMoney(n);
}

function buildInvoiceHtml(order: OrderRow): string {
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = order.discount ?? 0;
  const shipping = order.shippingFee > 0
    ? order.shippingFee
    : Math.max(0, +(order.total / 1.20 - subtotal + discount).toFixed(2));
  const taxable = Math.max(0, subtotal + shipping - discount);
  const tax = +(taxable * 0.20).toFixed(2);
  const ref = order.orderNumber ?? order.id;
  const date = new Date(order.createdAt).toLocaleString("en-GB");
  const rows = order.items
    .map((it) => {
      const metaParts: string[] = [];
      if (it.brand) metaParts.push(escapeHtml(it.brand));
      if (it.sku)   metaParts.push(`SKU ${escapeHtml(it.sku)}`);
      if (it.oem)   metaParts.push(`OEM ${escapeHtml(it.oem)}`);
      const meta = metaParts.length ? `<div class="meta">${metaParts.join(" · ")}</div>` : "";
      const fitText = it.fitments.slice(0, 3).map((f) => {
        const yr = f.yearFrom === f.yearTo ? `${f.yearFrom}` : `${f.yearFrom}–${f.yearTo}`;
        return `${escapeHtml(f.brand)} ${escapeHtml(f.model)} (${yr})`;
      }).join(" · ");
      const fitments = fitText
        ? `<div class="fits"><strong>Fits:</strong> ${fitText}${it.fitments.length > 3 ? ` +${it.fitments.length - 3} more` : ""}</div>`
        : "";
      return `
        <tr>
          <td>
            <div class="name">${escapeHtml(it.name)}</div>
            ${meta}
            ${fitments}
          </td>
          <td class="r">${it.qty}</td>
          <td class="r">${moneyForPrint(it.price)}</td>
          <td class="r">${moneyForPrint(it.price * it.qty)}</td>
        </tr>`;
    })
    .join("");

  return `<!doctype html><html><head>
    <meta charset="utf-8" />
    <title>Invoice ${escapeHtml(ref)}</title>
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
      td .fits { font-size: 10px; color: #555; margin-top: 2px; }
      td .fits strong { color: #444; text-transform: uppercase; letter-spacing: 0.08em; font-size: 9px; font-weight: 700; margin-right: 4px; }
      td.r, th.r { text-align: right; }
      .totals { margin-left: auto; margin-top: 16px; width: 280px; font-size: 13px; }
      .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
      .totals .sep { border-top: 1px solid #d4d4d8; margin: 8px 0; }
      .totals .grand { font-size: 16px; font-weight: 700; }
      .notes { margin-top: 24px; padding: 12px; background: #f6f6f7; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 12px; }
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
        <div class="label">Invoice</div>
        <div class="ref">${escapeHtml(ref)}</div>
        <div class="meta">${escapeHtml(date)}</div>
        <div class="status">${escapeHtml(order.status)}</div>
      </div>
    </div>

    <div class="grid">
      <div>
        <div class="label" style="margin-bottom:4px;">Bill to</div>
        <div><strong>${escapeHtml(order.customer)}</strong></div>
        <div>${escapeHtml(order.email)}</div>
        <div>${escapeHtml(order.phone)}</div>
      </div>
      <div>
        <div class="label" style="margin-bottom:4px;">Ship to</div>
        <div>${escapeHtml(order.shippingAddress)}</div>
        ${order.shippingAddressLine2 ? `<div>${escapeHtml(order.shippingAddressLine2)}</div>` : ""}
        <div>${escapeHtml(order.shippingCity)}${order.shippingCounty ? `, ${escapeHtml(order.shippingCounty)}` : ""}</div>
        ${order.shippingPostcode ? `<div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">${escapeHtml(order.shippingPostcode)}</div>` : ""}
        <div>${escapeHtml(order.shippingCountry)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="r">Qty</th>
          <th class="r">Unit</th>
          <th class="r">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div class="row"><span style="color:#555">Subtotal</span><span>${moneyForPrint(subtotal)}</span></div>
      <div class="row"><span style="color:#555">Shipping</span><span>${shipping === 0 ? "Free" : moneyForPrint(shipping)}</span></div>
      ${discount > 0 ? `<div class="row"><span style="color:#555">Discount</span><span>−${moneyForPrint(discount)}</span></div>` : ""}
      <div class="row"><span style="color:#555">VAT (20%)</span><span>${moneyForPrint(tax)}</span></div>
      <div class="sep"></div>
      <div class="row grand"><span>Total</span><span>${moneyForPrint(order.total)}</span></div>
    </div>

    ${order.notes ? `<div class="notes"><div class="label" style="margin-bottom:4px;">Notes</div>${escapeHtml(order.notes)}</div>` : ""}

    <div class="foot">Thank you for your order — MZR Parts</div>
  </div></body></html>`;
}

function printInvoiceInIframe(order: OrderRow) {
  const html = buildInvoiceHtml(order);
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
  // srcdoc is reliable across modern browsers and avoids about:blank quirks.
  iframe.srcdoc = html;
  iframe.addEventListener("load", () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("[invoice print]", e);
    }
    // Give the print dialog time to grab the document, then clean up.
    setTimeout(() => iframe.remove(), 1500);
  });
}
