import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTradeContext, tradePrice } from "@/lib/trade-pricing";
import { nextOrderNumber } from "@/lib/order-number";

const schema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(5),
  shippingAddress: z.string().min(3),
  shippingCity: z.string().min(2),
  shippingCountry: z.string().min(2),
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
    prisma.product.findMany({
      where: { id: { in: data.items.map((i) => i.productId) } },
    }),
    onBehalfTrade ? Promise.resolve(onBehalfTrade) : getTradeContext(),
  ]);
  if (products.length !== data.items.length) {
    return NextResponse.json({ error: "Unknown product in cart" }, { status: 400 });
  }

  let total = 0;
  const orderItemsCreate = data.items.map((i) => {
    const p = products.find((p) => p.id === i.productId)!;
    if (p.stock < i.quantity) {
      throw new Error(`Insufficient stock for ${p.name}`);
    }
    // Re-resolve the price server-side. For trade-approved users this applies
    // the active discount for the product's category — we never trust client
    // prices.
    const tp = tradePrice(Number(p.price), p.categoryId, trade);
    const originalPrice = Number(p.price);
    const price = tp.percent > 0 ? tp.discounted : originalPrice;
    total += price * i.quantity;
    return {
      productId: p.id,
      name: p.name,
      price,
      originalPrice,
      quantity: i.quantity,
    };
  });
  const shipping = total > 200 ? 0 : 9.99;
  const tax = +(total * 0.05).toFixed(2);
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
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          shippingAddress: data.shippingAddress,
          shippingCity: data.shippingCity,
          shippingCountry: data.shippingCountry,
          notes: data.notes,
          items: { create: orderItemsCreate },
        },
        include: { items: true },
      });
      // Stock is NOT deducted here. It is deducted only when the order moves
      // to DELIVERED (handled in /api/admin/orders/[id] PATCH). The earlier
      // availability check above prevents over-selling against current stock.
      return created;
    });
    return NextResponse.json({ id: order.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Order failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
