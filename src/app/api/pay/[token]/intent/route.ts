// Public payment-intent route for admin-created orders. The customer hits
// `/pay/<token>` (no login required); the React client on that page calls
// this endpoint to mint or reuse a Stripe PaymentIntent for the order. The
// existing webhook (/api/stripe/webhook) is what authoritatively flips the
// order to PAID once Stripe confirms.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, toStripeAmount, STRIPE_CURRENCY } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { paymentToken: token },
    include: {
      payments: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // Order has already been paid — tell the client to render the success
  // state instead of a payment form.
  const succeeded = order.payments.find((p) => p.status === "SUCCEEDED");
  if (succeeded || order.status === "PAID" || order.status === "DELIVERED" || order.status === "SHIPPED") {
    return NextResponse.json({ status: "paid" });
  }
  if (order.status === "CANCELLED") {
    return NextResponse.json({ status: "cancelled" }, { status: 410 });
  }

  // Try to reuse an existing PENDING PaymentIntent so the customer can
  // refresh the page without us hoarding orphaned intents on Stripe's side.
  const pending = order.payments.find((p) => p.status === "PENDING");
  if (pending) {
    try {
      const intent = await stripe().paymentIntents.retrieve(pending.providerPaymentId);
      // Re-use only if the live intent's amount matches what we stored — if
      // admin edited the order later, the amount could drift, in which case
      // we fall through and create a fresh one.
      const intentAmount = intent.amount;
      const expectedAmount = toStripeAmount(Number(order.total));
      const isReusable =
        intent.status === "requires_payment_method" ||
        intent.status === "requires_confirmation" ||
        intent.status === "requires_action";
      // Older intents were minted with automatic_payment_methods which
      // includes Stripe Link. Detect those and force a fresh card-only
      // intent so customers don't hit the Link OTP screen.
      const isCardOnly =
        Array.isArray(intent.payment_method_types) &&
        intent.payment_method_types.length === 1 &&
        intent.payment_method_types[0] === "card";
      if (isReusable && intentAmount === expectedAmount && isCardOnly && intent.client_secret) {
        return NextResponse.json({
          status: "open",
          clientSecret: intent.client_secret,
          paymentIntentId: intent.id,
        });
      }
    } catch {
      // Stripe lost the intent (e.g. deleted from dashboard). Fall through.
    }
  }

  // Fresh PaymentIntent.
  // `payment_method_types: ["card"]` (vs `automatic_payment_methods`) is
  // deliberate — it excludes Stripe Link, which otherwise pops up an email
  // OTP modal whenever the customer's email is recognised across any other
  // Stripe-powered shop. For this admin-issued pay link the simpler card-
  // only experience is what we want.
  let intent;
  try {
    intent = await stripe().paymentIntents.create({
      amount: toStripeAmount(Number(order.total)),
      currency: STRIPE_CURRENCY,
      payment_method_types: ["card"],
      receipt_email: order.customerEmail,
      description: `MZR Parts order ${order.orderNumber ?? order.id}`,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber ?? "",
        customerEmail: order.customerEmail,
        paymentToken: token,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  await prisma.payment.create({
    data: {
      orderId: order.id,
      userId: order.userId,
      provider: "stripe",
      providerPaymentId: intent.id,
      status: "PENDING",
      amount: order.total,
      currency: STRIPE_CURRENCY,
      meta: { intent: intent.id, source: "admin-pay-link" },
    },
  });

  return NextResponse.json({
    status: "open",
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
  });
}
