// Client-driven storefront payment confirmation. Mirrors the pay-link
// confirm endpoint at /api/pay/[token]/confirm: after the browser sees
// `stripe.confirmCardPayment()` succeed, it hits this route so the order
// flips PAID immediately without waiting for the Stripe webhook (which
// doesn't fire locally unless `stripe listen` is running, and can race the
// redirect anyway). Idempotent with the webhook.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { fromStripeAmount, stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { orderId?: string; paymentIntentId?: string }
    | null;
  const { orderId, paymentIntentId } = body ?? {};
  if (!orderId || !paymentIntentId) {
    return NextResponse.json({ error: "orderId and paymentIntentId required" }, { status: 400 });
  }

  // Tie the supplied paymentIntentId back to this order — prevents a stray
  // intent id from flipping someone else's row.
  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId: paymentIntentId },
    select: { id: true, orderId: true, status: true },
  });
  if (!payment || payment.orderId !== orderId) {
    return NextResponse.json({ error: "Payment not found for this order" }, { status: 404 });
  }
  if (payment.status === "SUCCEEDED") {
    return NextResponse.json({ status: "paid" });
  }

  // Always re-query Stripe — never trust the client's claim of success.
  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe().paymentIntents.retrieve(paymentIntentId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe lookup failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
  if (intent.status !== "succeeded") {
    return NextResponse.json(
      { status: intent.status, error: `PaymentIntent status is ${intent.status}` },
      { status: 409 },
    );
  }

  const charge =
    typeof intent.latest_charge === "string"
      ? await stripe().charges.retrieve(intent.latest_charge)
      : (intent.latest_charge as Stripe.Charge | null);
  const receiptUrl = charge?.receipt_url ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        amount: fromStripeAmount(intent.amount_received ?? intent.amount),
        receiptUrl,
        meta: { intent: intent.id, chargeId: charge?.id ?? null },
      },
    });
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
      await tx.order.update({
        where: { id: payment.orderId },
        data: { paidAt: new Date() },
      });
    }
  });

  return NextResponse.json({ status: "paid" });
}
