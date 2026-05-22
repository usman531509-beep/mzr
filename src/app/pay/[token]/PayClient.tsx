"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements, CardNumberElement, useStripe, useElements,
} from "@stripe/react-stripe-js";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StripeCardFields } from "@/components/StripeCardFields";
import { fmtMoney } from "@/lib/format";
import { useCart } from "@/lib/cart-store";

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

// Split-field card form via Stripe's CardNumber/Expiry/CVC elements. We use
// these (rather than PaymentElement) deliberately: PaymentElement bundles
// Stripe Link, which fires an "enter the OTP from your email" modal whenever
// the recipient's email is recognised across any other Stripe shop. For an
// admin-issued pay link the simplest, most predictable experience is just
// "type card, click pay". Every test card still works (4242 4242 4242 4242
// for success, etc.).

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
    <Elements stripe={stripePromise}>
      <PayForm clientSecret={clientSecret} token={token} total={total} orderId={orderId} />
    </Elements>
  );
}

function PayForm({
  clientSecret, token, total, orderId,
}: {
  clientSecret: string;
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
    const card = elements.getElement(CardNumberElement);
    if (!card) return;
    setBusy(true);
    setError(null);
    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      { payment_method: { card } },
    );
    if (stripeError) {
      setError(stripeError.message ?? "Payment failed. Please try again.");
      setBusy(false);
      return;
    }
    if (paymentIntent && paymentIntent.status === "succeeded") {
      // Mark our DB as paid immediately. Without this, the redirect below
      // would re-render the form because the order is still PENDING until
      // the Stripe webhook fires — and the webhook may be delayed or not
      // configured locally. The endpoint is idempotent with the webhook.
      try {
        await fetch(`/api/pay/${token}/confirm`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });
      } catch {
        // Non-fatal — the webhook will close the loop server-side either way.
      }
      // The items the customer just paid for are usually the same ones
      // still sitting in their local cart (the cart isn't cleared until
      // payment completes). Wipe it so they don't see ghost items after
      // returning to the store.
      clearCart();
      window.location.href = `/pay/${token}?paid=1`;
      return;
    }
    // 3DS / other actions are handled automatically by confirmCardPayment;
    // any non-succeeded terminal state surfaces via `error` above.
    setBusy(false);
    void orderId;
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <StripeCardFields />

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" disabled={!stripe || busy} className="w-full gap-2" size="lg">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
        {busy ? "Processing…" : `Pay ${fmtMoney(total)}`}
      </Button>

      <details className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
        <summary className="cursor-pointer select-none font-medium">
          Test card numbers
        </summary>
        <ul className="mt-2 space-y-0.5 font-mono">
          <li><strong className="text-foreground">4242 4242 4242 4242</strong> — succeeds</li>
          <li><strong className="text-foreground">4000 0027 6000 3184</strong> — requires 3D Secure</li>
          <li><strong className="text-foreground">4000 0000 0000 0002</strong> — declined</li>
          <li>Any future expiry, any CVC.</li>
        </ul>
      </details>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" /> Secured by Stripe — we never see your card details.
      </p>
    </form>
  );
}
