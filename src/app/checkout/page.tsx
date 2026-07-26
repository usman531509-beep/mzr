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
import { fmtMoney } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

        const bookList: SavedAddress[] = aData.ok ? aData.addresses : [];

        // Surface the profile address as a virtual entry in the same
        // picker the saved book uses. Customers expect to switch between
        // "my profile address" and "addresses I've added" from one place,
        // but the profile lives on the User row, not in the Address table.
        // Skip injection when an Address with identical line1+postcode is
        // already in the book — we don't want the same destination twice.
        let merged: SavedAddress[] = bookList;
        const p = pData.ok && pData.profile
          ? (pData.profile as {
              name: string | null; email: string;
              phone: string | null;
              address: string | null; addressLine2: string | null;
              city: string | null; county: string | null;
              postcode: string | null; country: string | null;
            })
          : null;
        const profileHasFullAddress = !!(
          p && p.address && p.city && p.postcode && p.country
        );
        if (profileHasFullAddress && p) {
          const dupe = bookList.some(
            (a) =>
              a.line1.trim().toLowerCase() === (p.address ?? "").trim().toLowerCase() &&
              a.postcode.trim().toUpperCase() === (p.postcode ?? "").trim().toUpperCase(),
          );
          if (!dupe) {
            merged = [
              {
                // Synthetic id — the order POST never sends this, it only
                // affects which option the dropdown highlights and what
                // `applyAddress` writes into the form.
                id: "__profile__",
                label: "Profile address",
                recipientName: p.name ?? "",
                phone: p.phone,
                line1: p.address!,
                line2: p.addressLine2,
                city: p.city!,
                county: p.county,
                postcode: p.postcode!,
                country: p.country!,
                // Treat profile as the default only when no book entry is
                // already flagged default — keeps existing manual picks.
                isDefault: !bookList.some((a) => a.isDefault),
              },
              ...bookList,
            ];
          }
        }
        setSavedAddresses(merged);

        const def = merged.find((a) => a.isDefault);
        if (def) {
          applyAddress(def);
          return;
        }
        // No default in either source — fall back to writing the profile
        // fields directly into the form so something pre-fills. Treat
        // empty strings as "not set" so the existing placeholders show
        // through when nothing's there.
        if (p) {
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
      <div className="container" style={{ maxWidth: 760, padding: "24px 20px 48px" }}>
        <Breadcrumbs
          className="mb-4"
          items={[{ label: "Basket", href: "/cart" }, { label: "Checkout" }]}
        />
        <div className="panel center" style={{ padding: "64px 24px" }}>
          <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="mb-1 text-lg font-bold text-ink">Your basket is empty</h2>
          <p className="muted mx-auto mb-5 max-w-sm text-sm">
            Add some parts to your basket before checking out.
          </p>
          <Link href="/products" className="btn btn-red">
            Shop parts
          </Link>
        </div>
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
    <div className="container" style={{ padding: "24px 20px 48px" }}>
      <Breadcrumbs
        className="mb-4"
        items={[{ label: "Basket", href: "/cart" }, { label: "Checkout" }]}
      />

      <h1 className="font-head text-[34px] uppercase leading-none tracking-[0.02em] text-ink lg:text-[42px]">
        Checkout
      </h1>
      <p className="muted mt-2 text-sm">
        {adminOnBehalf
          ? `This order will be placed under ${forCustomer!.name || forCustomer!.email} without a card payment.`
          : step === "shipping"
            ? "We'll take payment securely with Stripe on the next step."
            : "Enter your card details. Your payment is processed by Stripe we never store the card."}
      </p>

      {isAdmin && (
        <div className="mt-4">
          <AdminCustomerPicker
            selected={forCustomer}
            onSelect={pickCustomer}
            onClear={clearCustomer}
          />
        </div>
      )}

      <div className="split mt">
        <div>
          {err && (
            <div className="mb-4 rounded-lg border border-red/30 bg-red-soft px-4 py-3 text-sm font-medium text-red-700">
              {err}
            </div>
          )}

          {/* Shipping form */}
          {step === "shipping" && (
            <form
              id="checkout-shipping-form"
              onSubmit={adminOnBehalf ? submitAdminOrder : continueToPayment}
            >
              <div className="panel">
                <PanelTitle>1 · Contact details</PanelTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" value={form.customerName}
                         on={(v) => setForm({ ...form, customerName: v })} required />
                  <Field label="Email" type="email" value={form.customerEmail}
                         on={(v) => setForm({ ...form, customerEmail: v })} required />
                  <Field label="Phone" value={form.customerPhone}
                         on={(v) => setForm({ ...form, customerPhone: v })}
                         placeholder="07xxx xxxxxx" required />
                </div>
              </div>

              <div className="panel">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <PanelTitle>2 · Delivery address</PanelTitle>
                  {savedAddresses.length > 0 && (
                    <Link
                      href="/account/profile"
                      className="mb-2 text-[12px] font-semibold text-red hover:underline"
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
                  <div className="mb-4 rounded-lg border border-red/30 bg-red-soft/40 p-3">
                    <div className="mb-2">
                      <div className="text-sm font-semibold text-ink">
                        Where should we ship this?
                      </div>
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
                        className="h-11 border-red/50 bg-white text-[15px] font-medium shadow-sm transition hover:border-red focus:border-red"
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

                <div className="grid gap-4 sm:grid-cols-2">
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
                </div>
              </div>

              <div className="panel">
                <PanelTitle>3 · Order notes</PanelTitle>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Order notes (optional)</label>
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
            <div className="panel">
              <PanelTitle>Payment</PanelTitle>
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setStep("shipping"); setErr(null); }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red"
                >
                  <ArrowLeft className="h-3 w-3" /> Edit shipping details
                </button>
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary: "#e30613",
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
            </div>
          )}

          {step === "payment" && !stripePromise && (
            <div className="alert">
              Stripe is not configured. Add <code className="font-mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to your env and restart.
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="summary">
          <h3
            className="font-head"
            style={{
              margin: "0 0 12px",
              fontSize: 22,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Your order
          </h3>
          <ul className="space-y-2" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {displayItems.map((i) => {
              const preview = previewLines?.find((l) => l.productId === i.productId);
              const discounted = !!preview && preview.percent > 0;
              return (
                <li key={i.productId} className="flex justify-between gap-3 text-[13px]">
                  <span className="min-w-0 text-muted-foreground">
                    <span className="truncate">{i.name}</span>{" "}
                    <span className="opacity-60">× {i.quantity}</span>
                    {discounted && (
                      <span className="st ok" style={{ marginLeft: 6 }}>
                        Trade −{preview!.percent}%
                      </span>
                    )}
                  </span>
                  <span className="text-right tabular-nums">
                    {discounted ? (
                      <>
                        <span className="font-semibold text-ok">{fmtMoney(i.price * i.quantity)}</span>{" "}
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
          <div className="hr" style={{ margin: "12px 0" }} />
          <div className="ln">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmtMoney(displayTotals.subtotal)}</span>
          </div>
          <div className="ln">
            <span>Shipping</span>
            {displayTotals.shipping === 0 ? (
              <span style={{ color: "var(--ok)", fontWeight: 700 }}>FREE</span>
            ) : (
              <span className="tabular-nums">{fmtMoney(displayTotals.shipping)}</span>
            )}
          </div>
          <div className="ln">
            <span>VAT (20%)</span>
            <span className="tabular-nums">{fmtMoney(displayTotals.tax)}</span>
          </div>
          <div className="ln total">
            <span>Total</span>
            <span className="tabular-nums text-red">{fmtMoney(displayTotals.total)}</span>
          </div>
          {step === "shipping" && (
            <Button
              type="submit"
              form="checkout-shipping-form"
              disabled={submitting}
              className="mt-4 w-full font-extrabold uppercase tracking-wider"
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
        </div>
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
      <Button
        type="submit"
        disabled={!stripe || busy}
        className="w-full gap-2 font-extrabold uppercase tracking-wider"
        size="lg"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "Processing payment…" : `Pay ${fmtMoney(total)}`}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        Secured by Stripe — we never see your card details.
      </p>
    </form>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="font-head"
      style={{
        margin: "0 0 14px",
        fontSize: 22,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        lineHeight: 1,
      }}
    >
      {children}
    </h3>
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
    <div className={`field${full ? " sm:col-span-2" : ""}`} style={{ marginBottom: 0 }}>
      <label>{label}</label>
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
