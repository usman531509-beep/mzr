"use client";

import {
  CardNumberElement, CardExpiryElement, CardCvcElement,
} from "@stripe/react-stripe-js";

// Modern split-field card form. Uses three separate Stripe Elements
// (number / expiry / CVC) so the UI can lay them out properly instead of
// cramming them into a single inline row. Designed to work with either the
// storefront checkout or the public /pay/<token> page — pass `card` from
// `elements.getElement(CardNumberElement)` to `stripe.confirmCardPayment(...)`
// and Stripe ties the three fields together automatically.

const baseInputClass =
  "rounded-lg border border-border bg-card px-3.5 py-3 transition focus-within:border-primary/60";

// Match the surrounding dark theme. fontSize at 16px keeps mobile from
// auto-zooming into the field when tapped.
const stripeStyle = {
  base: {
    fontSize: "16px",
    color: "#fff",
    fontFamily: "inherit",
    iconColor: "#9ca3af",
    "::placeholder": { color: "#6b7280" },
  },
  invalid: { color: "#f87171", iconColor: "#f87171" },
} as const;

export function StripeCardFields() {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Card number
        </label>
        <div className={baseInputClass}>
          <CardNumberElement
            options={{
              style: stripeStyle,
              placeholder: "1234 1234 1234 1234",
              showIcon: true,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Expiry
          </label>
          <div className={baseInputClass}>
            <CardExpiryElement options={{ style: stripeStyle, placeholder: "MM / YY" }} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            CVC
          </label>
          <div className={baseInputClass}>
            <CardCvcElement options={{ style: stripeStyle, placeholder: "123" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
