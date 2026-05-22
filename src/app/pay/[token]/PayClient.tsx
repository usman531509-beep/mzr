"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements, PaymentElement, useStripe, useElements,
} from "@stripe/react-stripe-js";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/format";
import { useCart } from "@/lib/cart-store";

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

// Stripe's hosted PaymentElement. With the PaymentIntent restricted to
// `payment_method_types: ["card"]` (see /api/pay/[token]/intent), Stripe
// hides Link / wallets and renders only the polished card form, including
// its built-in dev-mode test-card autofill picker. We lean on this rather
// than hand-building card inputs so the look matches the rest of Stripe.

export function PayClient({
  token, total, orderId,
}: {
  token: string;
  total: number;
  orderId: string;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/pay/${token}/intent`, { method: "POST" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Could not start payment");
          return;
        }
        if (data.status === "paid") { setPaid(true); return; }
        setClientSecret(data.clientSecret);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (paid) {
    return (
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
        Payment received — refreshing…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Stripe is not configured. Set <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>.
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Preparing secure payment…
      </div>
    );
  }

  return (
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
      <PayForm token={token} total={total} orderId={orderId} />
    </Elements>
  );
}

function PayForm({
  token, total, orderId,
}: {
  token: string;
  total: number;
  orderId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const clearCart = useCart((s) => s.clear);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pay/${token}?paid=1`,
      },
      redirect: "if_required",
    });
    if (stripeError) {
      setError(stripeError.message ?? "Payment failed. Please try again.");
      setBusy(false);
      return;
    }
    if (paymentIntent && paymentIntent.status === "succeeded") {
      try {
        await fetch(`/api/pay/${token}/confirm`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });
      } catch {
        // Webhook will reconcile if the direct call failed.
      }
      clearCart();
      window.location.href = `/pay/${token}?paid=1`;
      return;
    }
    setBusy(false);
    void orderId;
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

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" disabled={!stripe || busy} className="w-full gap-2" size="lg">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
        {busy ? "Processing…" : `Pay ${fmtMoney(total)}`}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" /> Secured by Stripe — we never see your card details.
      </p>
    </form>
  );
}
