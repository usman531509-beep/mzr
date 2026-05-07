"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, ShoppingBag } from "lucide-react";

import { useCart, cartTotals, type CartItem } from "@/lib/cart-store";
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AdminCustomerPicker, type PickedCustomer } from "@/components/AdminCustomerPicker";

export default function CheckoutPage() {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const { data: session } = useSession();
  const router = useRouter();
  const totals = cartTotals(items); // baseline (admin's price) — kept for non-admin flow

  const isAdmin = session?.user?.role === "ADMIN";
  const [forCustomer, setForCustomer] = useState<PickedCustomer | null>(null);

  // Server-priced lines for admin-on-behalf-of-customer flow. When set, these
  // override the cart's stored prices so the summary reflects the customer's
  // trade discount before the order is placed.
  const [previewLines, setPreviewLines] = useState<
    { productId: string; price: number; originalPrice: number; percent: number }[] | null
  >(null);

  useEffect(() => {
    if (!isAdmin || !forCustomer || items.length === 0) {
      setPreviewLines(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/cart/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            forUserId: forCustomer.id,
            items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          }),
        });
        const data = await r.json();
        if (!cancelled && data.ok) setPreviewLines(data.lines);
      } catch {
        /* fall back to stored cart prices */
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin, forCustomer, items]);

  // Cart items, optionally re-priced via the preview lines. Used for the
  // checkout summary; the server is still the authoritative source at order
  // time.
  const displayItems = useMemo<CartItem[]>(() => {
    if (!previewLines) return items;
    return items.map((it) => {
      const line = previewLines.find((l) => l.productId === it.productId);
      return line ? { ...it, price: line.price } : it;
    });
  }, [items, previewLines]);
  const displayTotals = useMemo(() => cartTotals(displayItems), [displayItems]);

  const [form, setForm] = useState({
    customerName: session?.user?.name ?? "",
    customerEmail: session?.user?.email ?? "",
    customerPhone: "",
    shippingAddress: "",
    shippingCity: "",
    shippingCountry: "United Kingdom",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pickCustomer = (u: PickedCustomer) => {
    setForCustomer(u);
    // Auto-fill the shipping form from the customer's profile.
    setForm((f) => ({
      ...f,
      customerName:    u.name    ?? f.customerName,
      customerEmail:   u.email,
      customerPhone:   u.phone   ?? f.customerPhone,
      shippingAddress: u.address ?? f.shippingAddress,
      shippingCity:    u.city    ?? f.shippingCity,
      shippingCountry: u.country ?? f.shippingCountry,
    }));
  };
  const clearCustomer = () => setForCustomer(null);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-[var(--gutter)] py-6 lg:py-8">
        <Breadcrumbs
          className="mb-4"
          items={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]}
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 p-16 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Your cart is empty</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add some parts to your cart before checking out.
            </p>
            <Button asChild size="sm" className="mt-2">
              <Link href="/products">Shop parts</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        forUserId: isAdmin && forCustomer ? forCustomer.id : undefined,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Checkout failed");
      setSubmitting(false);
      return;
    }
    clear();
    router.push(`/checkout/success?id=${data.id}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-[var(--gutter)] py-6 lg:py-8">
      <Breadcrumbs
        className="mb-4"
        items={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]}
      />

      <h1 className="mb-6 text-2xl font-bold tracking-tight lg:text-3xl">Checkout</h1>

      {isAdmin && (
        <div className="mb-6">
          <AdminCustomerPicker
            selected={forCustomer}
            onSelect={pickCustomer}
            onClear={clearCustomer}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Shipping details</CardTitle>
            <CardDescription>
              {isAdmin && forCustomer
                ? `This order will be placed under ${forCustomer.name || forCustomer.email}.`
                : "Cash on Delivery — pay when your parts arrive."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {err && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {err}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full name" value={form.customerName}
                       on={(v) => setForm({ ...form, customerName: v })} required />
                <Field label="Email" type="email" value={form.customerEmail}
                       on={(v) => setForm({ ...form, customerEmail: v })} required />
                <Field label="Phone" value={form.customerPhone}
                       on={(v) => setForm({ ...form, customerPhone: v })} required />
                <Field label="Country" value={form.shippingCountry}
                       on={(v) => setForm({ ...form, shippingCountry: v })} required />
                <Field label="City" value={form.shippingCity}
                       on={(v) => setForm({ ...form, shippingCity: v })} required />
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Address</Label>
                  <Textarea
                    rows={3}
                    value={form.shippingAddress}
                    onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                    required
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Order notes (optional)</Label>
                  <Textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Placing order…" : `Place order — ${fmtMoney(displayTotals.total)}`}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Your order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2">
              {displayItems.map((i) => {
                const preview = previewLines?.find((l) => l.productId === i.productId);
                const discounted = !!preview && preview.percent > 0;
                return (
                  <li key={i.productId} className="flex justify-between gap-3 text-[13px]">
                    <span className="min-w-0 text-muted-foreground">
                      <span className="truncate">{i.name}</span>{" "}
                      <span className="opacity-60">× {i.quantity}</span>
                      {discounted && (
                        <Badge className="ml-1.5 bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/15">
                          Trade −{preview!.percent}%
                        </Badge>
                      )}
                    </span>
                    <span className="text-right tabular-nums">
                      {discounted ? (
                        <>
                          <span className="text-emerald-300">{fmtMoney(i.price * i.quantity)}</span>{" "}
                          <span className="text-[11px] text-muted-foreground line-through">
                            {fmtMoney(preview!.originalPrice * i.quantity)}
                          </span>
                        </>
                      ) : (
                        fmtMoney(i.price * i.quantity)
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Separator />
            <Row label="Subtotal" value={fmtMoney(displayTotals.subtotal)} />
            <Row label="Shipping" value={displayTotals.shipping === 0 ? "FREE" : fmtMoney(displayTotals.shipping)} />
            <Row label="Tax" value={fmtMoney(displayTotals.tax)} />
            <Separator />
            <Row label="Total" value={fmtMoney(displayTotals.total)} bold />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label, value, on, type = "text", required,
}: {
  label: string; value: string; on: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => on(e.target.value)} required={required} />
    </div>
  );
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-bold" : "text-sm"}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
