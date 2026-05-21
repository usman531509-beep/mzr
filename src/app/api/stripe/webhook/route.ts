// Stripe webhook. Stripe POSTs here when a PaymentIntent's state changes;
// this is the *authoritative* signal that an order has been paid (don't
// trust the client redirect — the webhook fires even if the customer
// closes the tab right after confirming).
//
// Local development: forward webhook traffic with the Stripe CLI:
//   stripe listen --forward-to localhost:3000/api/stripe/webhook
// Copy the signing secret it prints into STRIPE_WEBHOOK_SECRET (in .env)
// then restart `next dev`.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { fromStripeAmount, stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
// Webhook payloads are tiny — but they need the raw bytes so the signature
// verification works, so we read the body as ArrayBuffer below.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 500 },
    );
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  // Stripe's signature is computed over the *raw* body; do not parse JSON.
  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bad signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handleSucceeded(pi);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handleFailed(pi);
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handleCanceled(pi);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent) {
          await handleRefunded(charge.payment_intent as string, charge);
        }
        break;
      }
      // Other events are acknowledged with a 200 so Stripe stops retrying.
      default:
        break;
    }
  } catch (e) {
    // We deliberately return 500 on processing errors so Stripe retries
    // the webhook — the upserts below are idempotent and safe to repeat.
    const msg = e instanceof Error ? e.message : "Webhook handler error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleSucceeded(pi: Stripe.PaymentIntent) {
  // Latest charge → receipt URL when available.
  const charge =
    typeof pi.latest_charge === "string"
      ? await stripe().charges.retrieve(pi.latest_charge)
      : (pi.latest_charge as Stripe.Charge | null);
  const receiptUrl = charge?.receipt_url ?? null;

  // Find the linked order via the Payment row created at /api/checkout/intent.
  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId: pi.id },
    select: { id: true, orderId: true, status: true },
  });
  if (!payment) {
    // No matching record — possible if the intent was created outside this
    // app or the order tx rolled back. Nothing to update.
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        amount: fromStripeAmount(pi.amount_received ?? pi.amount),
        receiptUrl,
        meta: { intent: pi.id, chargeId: charge?.id ?? null },
      },
    });
    // Move the order to PAID if it's still in its pre-paid state. Once an
    // order is SHIPPED/DELIVERED we don't downgrade its status.
    const order = await tx.order.findUnique({
      where: { id: payment.orderId },
      select: { status: true },
    });
    if (order && (order.status === "PENDING" || order.status === "CANCELLED")) {
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: "PAID", paidAt: new Date() },
      });
    } else if (order) {
      // Stamp paidAt regardless so reporting reflects when payment cleared.
      await tx.order.update({
        where: { id: payment.orderId },
        data: { paidAt: new Date() },
      });
    }
  });
}

async function handleFailed(pi: Stripe.PaymentIntent) {
  await prisma.payment.updateMany({
    where: { providerPaymentId: pi.id },
    data: {
      status: "FAILED",
      failureMessage: pi.last_payment_error?.message ?? null,
      meta: { intent: pi.id, code: pi.last_payment_error?.code ?? null },
    },
  });
}

async function handleCanceled(pi: Stripe.PaymentIntent) {
  await prisma.payment.updateMany({
    where: { providerPaymentId: pi.id },
    data: { status: "CANCELED", meta: { intent: pi.id } },
  });
}

async function handleRefunded(piId: string, charge: Stripe.Charge) {
  // Mark the Payment row as REFUNDED (full or partial — we just flag it;
  // amount stays as the original capture).
  await prisma.payment.updateMany({
    where: { providerPaymentId: piId },
    data: {
      status: "REFUNDED",
      meta: { intent: piId, chargeId: charge.id, refunded: charge.amount_refunded },
    },
  });
}
