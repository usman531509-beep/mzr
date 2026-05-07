import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

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

  let total = 0;
  const orderItemsCreate = data.items.map((i) => {
    const p = products.find((x) => x.id === i.productId)!;
    if (p.stock < i.quantity) throw new Error(`Insufficient stock for ${p.name}`);
    const base = Number(p.price);
    const pct = discounts.get(p.categoryId) ?? 0;
    const price = pct > 0 ? +(base * (1 - pct / 100)).toFixed(2) : base;
    total += price * i.quantity;
    return { productId: p.id, name: p.name, price, originalPrice: base, quantity: i.quantity };
  });

  const shipping = total > 200 ? 0 : 9.99;
  const tax = +(total * 0.05).toFixed(2);
  const grand = +(total + shipping + tax).toFixed(2);

  try {
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
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
      // immediately and stamp the flag. Any other starting status leaves
      // stock untouched until a future PATCH moves it to DELIVERED.
      if (created.status === "DELIVERED") {
        for (const i of data.items) {
          await tx.product.update({
            where: { id: i.productId },
            data: { stock: { decrement: i.quantity } },
          });
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
      target: `Order #${order.id.slice(0, 8)} for ${data.customerName}`,
      targetId: order.id,
      meta: { onBehalfOf: data.userId, status: order.status },
    });
    return NextResponse.json({ id: order.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Order failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
