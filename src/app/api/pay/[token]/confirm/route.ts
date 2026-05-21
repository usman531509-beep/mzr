// Client-driven payment confirmation. After Stripe.confirmCardPayment()
// resolves successfully on the browser, the PayClient hits this endpoint so
// the order is marked PAID *immediately* — instead of relying purely on the
// Stripe webhook (which doesn't fire locally unless `stripe listen` is
// running, and can race the redirect anyway).
//
// We still treat the webhook as the canonical source — this route does the
// same work the webhook does and is fully idempotent, so the two paths
// converge on the same state regardless of which one wins.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { fromStripeAmount, stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { paymentIntentId?: string } | null;
  const paymentIntentId = body?.paymentIntentId;
  if (!paymentIntentId) {
    return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });
  }

  // Confirm the order matches the token AND the PaymentIntent — defence in
  // depth, prevents an attacker who guessed an intent id from marking an
  // unrelated order paid.
  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId: paymentIntentId },
    select: {
      id: true,
      orderId: true,
      status: true,
      order: { select: { paymentToken: true } },
    },
  });
  if (!payment || payment.order?.paymentToken !== token) {
    return NextResponse.json({ error: "Payment not found for this link" }, { status: 404 });
  }

  // If we already flipped to SUCCEEDED (e.g. the webhook beat us) there's
  // nothing left to do.
  if (payment.status === "SUCCEEDED") {
    return NextResponse.json({ status: "paid" });
  }

  // Re-query Stripe — never trust the client's claim of success.
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

  // Latest charge → receipt URL.
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
