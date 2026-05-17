import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { nextOrderNumber } from "@/lib/order-number";
import { consumeLayersFifo, getFifoRetailBreakdown, refreshProductRetail } from "@/lib/fifo";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string().min(1),
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(3),
  shippingAddress: z.string().min(3),
  shippingCity: z.string().min(1),
  shippingCountry: z.string().min(1),
  notes: z.string().optional(),
  // Admin can override the status of the new order (e.g. mark PAID directly).
  status: z.enum(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  items: z
    .array(z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
    }))
    .min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const targetUser = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 400 });

  const products = await prisma.product.findMany({
    where: { id: { in: data.items.map((i) => i.productId) } },
  });
  if (products.length !== data.items.length) {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }

  // If the customer is trade-approved, apply category discounts authoritatively.
  let discounts = new Map<string, number>();
  if (targetUser.tradeApproved && targetUser.active) {
    const rows = await prisma.tradeDiscount.findMany();
    discounts = new Map(rows.map((r) => [r.categoryId, r.percent]));
  }

  for (const i of data.items) {
    const p = products.find((x) => x.id === i.productId)!;
    if (p.stock < i.quantity) {
      return NextResponse.json({ error: `Insufficient stock for ${p.name}` }, { status: 400 });
    }
  }

  // FIFO retail: split each cart line into one OrderItem per batch so each
  // unit is billed at the retail of the batch it'll come from. Trade
  // discount is applied per segment.
  let total = 0;
  const orderItemsCreate: Array<{
    productId: string; name: string; price: number; originalPrice: number; quantity: number;
  }> = [];
  for (const i of data.items) {
    const p = products.find((x) => x.id === i.productId)!;
    const segments = await getFifoRetailBreakdown(prisma, {
      productId: p.id,
      qty: i.quantity,
      fallbackRetail: Number(p.price),
    });
    const pct = discounts.get(p.categoryId) ?? 0;
    for (const seg of segments) {
      const base = seg.unitRetail;
      const price = pct > 0 ? +(base * (1 - pct / 100)).toFixed(2) : base;
      total += price * seg.qty;
      orderItemsCreate.push({
        productId: p.id,
        name: p.name,
        price,
        originalPrice: base,
        quantity: seg.qty,
      });
    }
  }

  const shipping = total > 200 ? 0 : 9.99;
  const tax = +(total * 0.05).toFixed(2);
  const grand = +(total + shipping + tax).toFixed(2);

  try {
    const order = await prisma.$transaction(async (tx) => {
      const orderNumber = await nextOrderNumber(tx);
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: data.userId,
          createdByAdminId: session.user.id,
          status: data.status ?? "PENDING",
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
      // If the admin created the order with DELIVERED status, deduct stock
      // immediately, consume FIFO layers for cost attribution, and stamp
      // the flag. Any other starting status leaves stock untouched until a
      // future PATCH moves it to DELIVERED.
      // Reserve stock at create unless the admin explicitly marked the order
      // CANCELLED on the way in. Older model only consumed at DELIVERED,
      // which made the displayed catalogue price lag when a later order was
      // entered before the prior one shipped — now FIFO advances immediately.
      if (created.status !== "CANCELLED") {
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
      }
      return created;
    });
    await logActivity(session, {
      action: "created",
      moduleKey: "order",
      target: `Order ${order.orderNumber ?? `#${order.id.slice(0, 8)}`} for ${data.customerName}`,
      targetId: order.id,
      meta: { onBehalfOf: data.userId, status: order.status },
    });
    return NextResponse.json({ id: order.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Order failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
