import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTradeContext, tradePrice } from "@/lib/trade-pricing";
import { nextOrderNumber } from "@/lib/order-number";
import { consumeLayersFifo, getFifoRetailBreakdown, refreshProductRetail } from "@/lib/fifo";

const schema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(5),
  shippingAddress:      z.string().min(3),
  shippingAddressLine2: z.string().max(200).optional(),
  shippingCity:         z.string().min(2),
  shippingCounty:       z.string().max(120).optional(),
  shippingPostcode:     z.string().min(3).max(20),
  shippingCountry:      z.string().min(2),
  notes: z.string().optional(),
  // Admin-only: place this order on behalf of another user. Ignored for
  // non-admin sessions.
  forUserId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1),
      }),
    )
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

  // Admin checking out on behalf of a customer. The order's userId becomes
  // the customer's id, createdByAdminId stamps the admin who placed it, and
  // trade pricing is resolved from the *customer's* trade status (not the
  // admin's), so traders get their discount even when admin places the order.
  const isAdminPlacingForCustomer =
    session?.user?.role === "ADMIN" && !!data.forUserId;

  let onBehalfTrade: Awaited<ReturnType<typeof getTradeContext>> | null = null;
  if (isAdminPlacingForCustomer) {
    const target = await prisma.user.findUnique({
      where: { id: data.forUserId! },
      select: { id: true, active: true, tradeApproved: true },
    });
    if (!target || !target.active) {
      return NextResponse.json({ error: "Customer not found" }, { status: 400 });
    }
    if (target.tradeApproved) {
      const rows = await prisma.tradeDiscount.findMany();
      onBehalfTrade = {
        isTrader: true,
        discounts: new Map(rows.map((r) => [r.categoryId, r.percent])),
      };
    } else {
      onBehalfTrade = { isTrader: false, discounts: new Map() };
    }
  }

  const [products, trade] = await Promise.all([
    // Soft-deleted products are rejected here — placing a new order with one
    // would be a server-side bug, since the storefront filters them out.
    prisma.product.findMany({
      where: { id: { in: data.items.map((i) => i.productId) }, deletedAt: null },
    }),
    onBehalfTrade ? Promise.resolve(onBehalfTrade) : getTradeContext(),
  ]);
  if (products.length !== data.items.length) {
    return NextResponse.json(
      { error: "One or more items in your cart are no longer available. Refresh the cart and try again." },
      { status: 400 },
    );
  }

  // Validate stock up front so we can fail fast before doing any layer reads.
  for (const i of data.items) {
    const p = products.find((p) => p.id === i.productId)!;
    if (p.stock < i.quantity) {
      return NextResponse.json({ error: `Insufficient stock for ${p.name}` }, { status: 400 });
    }
  }

  // FIFO retail: a single cart line may span multiple batches, each with its
  // own retail price. We split into one OrderItem per batch so customers
  // pay the actual price for each unit (old units at old retail, new units
  // at new retail). Trade discount applies per segment.
  let total = 0;
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
      total += price * seg.qty;
      orderItemsCreate.push({
        productId: p.id,
        name: p.name,
        price,
        originalPrice,
        quantity: seg.qty,
      });
    }
  }
  const shipping = total > 200 ? 0 : 9.99;
  // VAT (20%) is charged on goods + shipping.
  const tax = +((total + shipping) * 0.20).toFixed(2);
  const grand = +(total + shipping + tax).toFixed(2);

  try {
    const order = await prisma.$transaction(async (tx) => {
      const orderNumber = await nextOrderNumber(tx);
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: isAdminPlacingForCustomer ? data.forUserId! : (session?.user?.id ?? null),
          createdByAdminId: isAdminPlacingForCustomer ? session!.user.id : null,
          status: "PENDING",
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

      // Reserve stock immediately at order create — the next order should
      // see the next batch's price (FIFO) without having to wait for this
      // one to be delivered. Each created OrderItem corresponds to one
      // batch (after the FIFO retail split above) so we consume layers and
      // decrement product.stock per item.
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
      return created;
    });
    return NextResponse.json({ id: order.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Order failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
