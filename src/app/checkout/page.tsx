"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, ShoppingBag } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements, PaymentElement, useStripe, useElements,
} from "@stripe/react-stripe-js";

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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AdminCustomerPicker, type PickedCustomer } from "@/components/AdminCustomerPicker";

type SavedAddress = {
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

// Load Stripe.js once and reuse the promise across renders / mounts.
const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

export default function CheckoutPage() {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const { data: session } = useSession();
  const router = useRouter();
  const totals = cartTotals(items);

  const isAdmin = session?.user?.role === "ADMIN";
  const [forCustomer, setForCustomer] = useState<PickedCustomer | null>(null);

  // Two-step flow for the customer-side Stripe path:
  //   "shipping" → customer enters address + clicks Continue to payment
  //   "payment"  → Stripe Payment Element rendered with the intent's secret
  const [step, setStep] = useState<"shipping" | "payment">("shipping");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

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
    shippingAddress: "",       // line 1
    shippingAddressLine2: "",  // optional
    shippingCity: "",
    shippingCounty: "",        // optional
    shippingPostcode: "",
    shippingCountry: "United Kingdom",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Saved-address book for the signed-in customer. Loaded once after sign-in
  // checks pass; the dropdown above the shipping form lets them pre-fill
  // every shipping field from a stored address.
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");

  // Apply a saved address to the form. Extracted so we can call it both
  // when the user picks one from the dropdown and (auto) when their default
  // address arrives from the API.
  const applyAddress = (a: SavedAddress) => {
    setForm((f) => ({
      ...f,
      customerName:         a.recipientName || f.customerName,
      customerPhone:        a.phone ?? f.customerPhone,
      shippingAddress:      a.line1,
      shippingAddressLine2: a.line2 ?? "",
      shippingCity:         a.city,
      shippingCounty:       a.county ?? "",
      shippingPostcode:     a.postcode,
      shippingCountry:      a.country,
    }));
    setSelectedAddressId(a.id);
  };

  useEffect(() => {
    // Skip the fetch for guests and for the admin-on-behalf flow.
    if (!session?.user?.id || isAdmin) {
      setSavedAddresses([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Fetch saved addresses AND profile in parallel. Saved addresses
        // take priority for pre-fill (a customer who created one knows
        // it's their preferred shipping spot); profile is the fallback
        // for customers who only filled out /account/profile but never
        // added an address-book entry. Without that fallback the form
        // looked empty even though the user had a profile address —
        // which made the profile feature feel broken.
        const [aRes, pRes] = await Promise.all([
          fetch("/api/account/addresses"),
          fetch("/api/account/profile"),
        ]);
        const aData = await aRes.json().catch(() => ({ ok: false }));
        const pData = await pRes.json().catch(() => ({ ok: false }));
        if (cancelled) return;

        const list: SavedAddress[] = aData.ok ? aData.addresses : [];
        setSavedAddresses(list);

        const def = list.find((a) => a.isDefault);
        if (def) {
          applyAddress(def);
          return;
        }
        // No saved-address default — fall back to the profile's default
        // shipping address. Treat empty strings as "not set" so the
        // form's existing placeholders show through when nothing's there.
        if (pData.ok && pData.profile) {
          const p = pData.profile as {
            name: string | null; email: string;
            phone: string | null;
            address: string | null; addressLine2: string | null;
            city: string | null; county: string | null;
            postcode: string | null; country: string | null;
          };
          setForm((f) => ({
            ...f,
            customerName:         p.name  || f.customerName,
            customerEmail:        p.email || f.customerEmail,
            customerPhone:        p.phone || f.customerPhone,
            shippingAddress:      p.address      ?? f.shippingAddress,
            shippingAddressLine2: p.addressLine2 ?? f.shippingAddressLine2,
            shippingCity:         p.city         ?? f.shippingCity,
            shippingCounty:       p.county       ?? f.shippingCounty,
            shippingPostcode:     p.postcode     ?? f.shippingPostcode,
            shippingCountry:      p.country      || f.shippingCountry,
          }));
        }
      } catch {
        /* network error — checkout still works, just no pre-fill */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, isAdmin]);

  const pickCustomer = (u: PickedCustomer) => {
    setForCustomer(u);
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

  // Admin-on-behalf still uses the legacy "create immediately, no payment"
  // flow — admins are recording an order, not taking a card right now.
  const adminOnBehalf = isAdmin && !!forCustomer;

  const submitAdminOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        forUserId: forCustomer?.id,
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

  const continueToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/checkout/intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) {
        setErr(data.error || "Could not start payment");
        return;
      }
      setOrderId(data.orderId);
      setClientSecret(data.clientSecret);
      setStep("payment");
    } finally {
      setSubmitting(false);
    }
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
            <CardTitle>
              {step === "shipping" ? "Shipping details" : "Payment"}
            </CardTitle>
            <CardDescription>
              {adminOnBehalf
                ? `This order will be placed under ${forCustomer!.name || forCustomer!.email} without a card payment.`
                : step === "shipping"
                  ? "We'll take payment securely with Stripe on the next step."
                  : "Enter your card details. Your payment is processed by Stripe we never store the card."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {err && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
              </div>
            )}

            {/* Shipping form */}
            {step === "shipping" && (
              <form
                id="checkout-shipping-form"
                onSubmit={adminOnBehalf ? submitAdminOrder : continueToPayment}
                className="space-y-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Contact */}
                  <Field label="Full name" value={form.customerName}
                         on={(v) => setForm({ ...form, customerName: v })} required />
                  <Field label="Email" type="email" value={form.customerEmail}
                         on={(v) => setForm({ ...form, customerEmail: v })} required />
                  <Field label="Phone" value={form.customerPhone}
                         on={(v) => setForm({ ...form, customerPhone: v })}
                         placeholder="07xxx xxxxxx" required />

                  <div className="sm:col-span-2 flex flex-wrap items-end justify-between gap-2 -mb-1 mt-2">
                    <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
                      Shipping address
                    </span>
                    {savedAddresses.length > 0 && (
                      <Link
                        href="/account/profile"
                        className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                      >
                        Manage saved addresses →
                      </Link>
                    )}
                  </div>

                  {/* Address picker card. Wrapping the Select in a bordered
                      box with a clear heading + helper line makes it
                      unmistakably the "change shipping destination" control
                      — the unstyled trigger was reading as just another
                      muted input below the contact fields. */}
                  {savedAddresses.length > 0 && (
                    <div className="sm:col-span-2 rounded-lg border border-primary/30 bg-primary/[0.04] p-3 ring-1 ring-inset ring-primary/20">
                      <div className="mb-2">
                        <Label className="text-sm font-semibold text-foreground">
                          Where should we ship this?
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Pick a saved address or use a new one for this order.
                        </p>
                      </div>
                      <Select
                        value={selectedAddressId || "new"}
                        onValueChange={(v) => {
                          if (v === "new") {
                            setSelectedAddressId("");
                            return;
                          }
                          const a = savedAddresses.find((x) => x.id === v);
                          if (a) applyAddress(a);
                        }}
                      >
                        <SelectTrigger
                          className="h-11 border-primary/50 bg-background text-[15px] font-medium shadow-sm transition hover:border-primary focus:border-primary"
                        >
                          <SelectValue placeholder="Pick a saved address" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">+ Use a new address</SelectItem>
                          {savedAddresses.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {(a.label || a.recipientName) + " — " + a.line1 + ", " + a.postcode}
                              {a.isDefault ? "  (default)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Field
                    label="Address line 1" full
                    value={form.shippingAddress}
                    on={(v) => setForm({ ...form, shippingAddress: v })}
                    placeholder="House number and street"
                    required
                  />
                  <Field
                    label="Address line 2 (optional)" full
                    value={form.shippingAddressLine2}
                    on={(v) => setForm({ ...form, shippingAddressLine2: v })}
                    placeholder="Apartment, suite, building"
                  />
                  <Field
                    label="Town / City"
                    value={form.shippingCity}
                    on={(v) => setForm({ ...form, shippingCity: v })}
                    required
                  />
                  <Field
                    label="County (optional)"
                    value={form.shippingCounty}
                    on={(v) => setForm({ ...form, shippingCounty: v })}
                    placeholder="e.g. Greater London"
                  />
                  <Field
                    label="Postcode"
                    value={form.shippingPostcode}
                    on={(v) => setForm({ ...form, shippingPostcode: v.toUpperCase() })}
                    placeholder="e.g. SW1A 1AA"
                    autoComplete="postal-code"
                    required
                  />
                  <Field
                    label="Country"
                    value={form.shippingCountry}
                    on={(v) => setForm({ ...form, shippingCountry: v })}
                    required
                  />

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Order notes (optional)</Label>
                    <Textarea
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                </div>
                {/* Submit button lives outside the form (below the order
                    summary) so it sits under the totals on mobile. The
                    `form="checkout-shipping-form"` attribute on that button
                    links it back to this form. */}
              </form>
            )}

            {/* Stripe Payment Element */}
            {step === "payment" && clientSecret && stripePromise && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setStep("shipping"); setErr(null); }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" /> Edit shipping details
                </button>
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "night",
                      variables: {
                        colorPrimary: "#e8151b",
                        borderRadius: "8px",
                        fontSizeBase: "15px",
                      },
                    },
                  }}
                >
                  <StripePaymentForm
                    orderId={orderId!}
                    total={displayTotals.total}
                    onError={(m) => setErr(m)}
                    onPaying={(v) => setSubmitting(v)}
                    onSuccess={() => clear()}
                  />
                </Elements>
              </div>
            )}

            {step === "payment" && !stripePromise && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
                Stripe is not configured. Add <code className="font-mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to your env and restart.
              </div>
            )}
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
            <Row label="VAT (20%)" value={fmtMoney(displayTotals.tax)} />
            <Separator />
            <Row label="Total" value={fmtMoney(displayTotals.total)} bold />
            {step === "shipping" && (
              <Button
                type="submit"
                form="checkout-shipping-form"
                disabled={submitting}
                className="mt-2 w-full"
                size="lg"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting
                  ? (adminOnBehalf ? "Placing order…" : "Starting payment…")
                  : adminOnBehalf
                    ? `Place order — ${fmtMoney(displayTotals.total)}`
                    : `Continue to payment — ${fmtMoney(displayTotals.total)}`}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Suppress unused-var warning while keeping the prop for future use. */}
      <span hidden>{totals.total}</span>
    </div>
  );
}

function StripePaymentForm({
  orderId, total, onError, onPaying, onSuccess,
}: {
  orderId: string;
  total: number;
  onError: (msg: string) => void;
  onPaying: (paying: boolean) => void;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    onPaying(true);
    onError("");

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?id=${orderId}`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      onError(stripeError.message ?? "Payment failed. Please try again.");
      setBusy(false);
      onPaying(false);
      return;
    }
    if (paymentIntent && paymentIntent.status === "succeeded") {
      // Close the loop server-side immediately — don't wait for the Stripe
      // webhook (which doesn't fire locally without `stripe listen`).
      try {
        await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId, paymentIntentId: paymentIntent.id }),
        });
      } catch {
        // Webhook will reconcile if the direct call failed.
      }
      onSuccess();
      window.location.href = `/checkout/success?id=${orderId}`;
      return;
    }
    setBusy(false);
    onPaying(false);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <PaymentElement
        options={{
          layout: "tabs",
          // Letting Stripe collect country/postal-code itself sidesteps the
          // "you said never but didn't pass it in confirmParams" error from
          // `fields.billingDetails.address: "never"`. Wallets stay disabled.
          wallets: { applePay: "never", googlePay: "never" },
        }}
      />
      <Button type="submit" disabled={!stripe || busy} className="w-full gap-2" size="lg">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "Processing payment…" : `Pay ${fmtMoney(total)}`}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        Secured by Stripe — we never see your card details.
      </p>
    </form>
  );
}

function Field({
  label, value, on, type = "text", required, full, placeholder, autoComplete,
}: {
  label: string;
  value: string;
  on: (v: string) => void;
  type?: string;
  required?: boolean;
  full?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className={`${full ? "sm:col-span-2 " : ""}space-y-1.5`}>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => on(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
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
