// Singleton server-side Stripe client.
//
// The SDK is constructed lazily — accessing the missing env var only when a
// route actually tries to talk to Stripe avoids tripping the import-time
// crash that would otherwise happen during build (e.g. when the prod
// deploy script first runs without the keys configured).

import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add your Stripe test key to .env and restart the dev server.",
    );
  }
  _stripe = new Stripe(key, {
    // Type assertion: the SDK pins to its own bundled API version, which
    // changes per release. We let it use that default rather than hard-
    // coding here.
    typescript: true,
  });
  return _stripe;
}

/** Convert a £-denominated decimal amount into the integer-pence amount
 *  Stripe expects. Always pass numbers in the order's currency. */
export function toStripeAmount(amount: number): number {
  return Math.round(amount * 100);
}

/** Inverse — used when rendering Stripe values back to the customer. */
export function fromStripeAmount(amount: number): number {
  return +(amount / 100).toFixed(2);
}

export const STRIPE_CURRENCY = "gbp";
