// Customer checkout endpoint. Creates the order + reserves stock + opens
// a Stripe PaymentIntent in one round-trip. The frontend uses the returned
// `clientSecret` to render the Payment Element; the webhook is what
// authoritatively marks the order PAID once Stripe reports success.

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTradeContext, tradePrice } from "@/lib/trade-pricing";
import { nextOrderNumber } from "@/lib/order-number";
import { consumeLayersFifo, getFifoRetailBreakdown, refreshProductRetail } from "@/lib/fifo";
import { stripe, toStripeAmount, STRIPE_CURRENCY } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const schema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(5),
  // UK postal address — line 1 + postcode required, line 2 + county optional.
  shippingAddress:      z.string().min(3),
  shippingAddressLine2: z.string().max(200).optional(),
  shippingCity:         z.string().min(2),
  shippingCounty:       z.string().max(120).optional(),
  shippingPostcode:     z.string().min(3).max(20),
  shippingCountry:      z.string().min(2),
  notes: z.string().optional(),
  items: z
    .array(z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
    }))
    .min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const [products, trade] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: data.items.map((i) => i.productId) } },
    }),
    getTradeContext(),
  ]);
  if (products.length !== data.items.length) {
    return NextResponse.json({ error: "Unknown product in cart" }, { status: 400 });
  }
  for (const i of data.items) {
    const p = products.find((p) => p.id === i.productId)!;
    if (p.stock < i.quantity) {
      return NextResponse.json({ error: `Insufficient stock for ${p.name}` }, { status: 400 });
    }
  }

  // Re-compute totals server-side from the cart payload — never trust the
  // client's number. Same FIFO retail + trade pricing rules as elsewhere.
  let subtotal = 0;
  const orderItemsCreate: Array<{
    productId: string; name: string; price: number; originalPrice: number; quantity: number;
  }> = [];
  for (const i of data.items) {
    const p = products.find((p) => p.id === i.productId)!;
    const segments = await getFifoRetailBreakdown(prisma, {
      productId: p.id,
      qty: i.quantity,
      fallbackRetail: Number(p.price),
    });
    for (const seg of segments) {
      const tp = tradePrice(seg.unitRetail, p.categoryId, trade);
      const originalPrice = seg.unitRetail;
      const price = tp.percent > 0 ? tp.discounted : originalPrice;
      subtotal += price * seg.qty;
      orderItemsCreate.push({
        productId: p.id,
        name: p.name,
        price,
        originalPrice,
        quantity: seg.qty,
      });
    }
  }
  const shipping = subtotal > 200 ? 0 : 9.99;
  // VAT 20 % on goods + shipping (no customer-side discount yet).
  const taxable = Math.max(0, subtotal + shipping);
  const tax = +(taxable * 0.20).toFixed(2);
  const grand = +(taxable + tax).toFixed(2);
  if (grand <= 0) {
    return NextResponse.json({ error: "Empty order" }, { status: 400 });
  }

  // 1) Open a PaymentIntent before touching the DB. If Stripe rejects, no
  //    order is created and the customer gets a clean error.
  //
  // Card-only (no automatic_payment_methods) so the storefront mounts a
  // plain CardElement and doesn't trip Stripe Link's OTP-email flow.
  let intent;
  try {
    intent = await stripe().paymentIntents.create({
      amount: toStripeAmount(grand),
      currency: STRIPE_CURRENCY,
      payment_method_types: ["card"],
      // Receipt is sent by Stripe to whatever email we attach; the email
      // also lets Stripe attach the customer to the payment in their UI.
      receipt_email: data.customerEmail,
      description: "MZR Parts order",
      metadata: {
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        userId: session?.user?.id ?? "",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // 2) In a transaction: assign an order number, create the order + items,
  //    reserve FIFO stock, and persist the PENDING Payment row tied to the
  //    PaymentIntent. The webhook flips this to SUCCEEDED on completion.
  //
  // The transaction runs N stock decrements + N FIFO consumes + a retail
  // refresh per touched product, all sequentially. On production with
  // cross-region DB latency this can easily run past Prisma's default 5s
  // interactive-transaction window and crash with "Transaction not found".
  // The maxWait/timeout bump below matches the admin order-create flow.
  try {
    const result = await prisma.$transaction(async (tx) => {
      const orderNumber = await nextOrderNumber(tx);
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: session?.user?.id ?? null,
          status: "PENDING",
          // Mint an unguessable resume token so the customer can come back
          // and pay later (via /pay/<token> or the "Pay now" button on
          // /account/orders) if they bail out of checkout before completing.
          paymentToken: randomBytes(18).toString("base64url"),
          total: grand,
          shippingFee: shipping,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          shippingAddress:      data.shippingAddress,
          shippingAddressLine2: data.shippingAddressLine2?.trim() || null,
          shippingCity:         data.shippingCity,
          shippingCounty:       data.shippingCounty?.trim() || null,
          shippingPostcode:     data.shippingPostcode.trim().toUpperCase(),
          shippingCountry:      data.shippingCountry,
          notes: data.notes,
          items: { create: orderItemsCreate },
        },
        include: { items: true },
      });

      const productIdsTouched = new Set<string>();
      for (const oi of created.items) {
        await tx.product.update({
          where: { id: oi.productId },
          data: { stock: { decrement: oi.quantity } },
        });
        await consumeLayersFifo(tx, {
          orderItemId: oi.id,
          productId: oi.productId,
          qty: oi.quantity,
        });
        productIdsTouched.add(oi.productId);
      }
      for (const pid of productIdsTouched) {
        await refreshProductRetail(tx, pid);
      }
      await tx.order.update({
        where: { id: created.id },
        data: { stockDeducted: true },
      });

      await tx.payment.create({
        data: {
          orderId: created.id,
          userId: session?.user?.id ?? null,
          provider: "stripe",
          providerPaymentId: intent.id,
          status: "PENDING",
          amount: grand,
          currency: STRIPE_CURRENCY,
          meta: { intent: intent.id },
        },
      });

      return created;
    }, { maxWait: 10_000, timeout: 30_000 });

    return NextResponse.json({
      orderId: result.id,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
    });
  } catch (e) {
    // DB writes failed — cancel the PaymentIntent so the customer isn't
    // left with a live charge for an order that doesn't exist.
    try { await stripe().paymentIntents.cancel(intent.id); } catch { /* ignore */ }
    const msg = e instanceof Error ? e.message : "Order failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
