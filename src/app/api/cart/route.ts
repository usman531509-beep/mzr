import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTradeContext, tradePrice } from "@/lib/trade-pricing";

export const dynamic = "force-dynamic";

type IncomingItem = { productId: string; quantity: number };

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ items: [] }, { status: 401 });

  const [cart, trade] = await Promise.all([
    prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: { product: { include: { brand: true } } },
        },
      },
    }),
    getTradeContext(),
  ]);

  const items = (cart?.items ?? []).map((it) => {
    const tp = tradePrice(Number(it.product.price), it.product.categoryId, trade);
    return {
      productId: it.productId,
      slug: it.product.slug,
      name: it.product.name,
      // Use the trade-discounted price for trade-approved users so the cart
      // (and ultimately the order) is billed at the discounted rate.
      price: tp.percent > 0 ? tp.discounted : Number(it.product.price),
      image: it.product.images[0],
      quantity: it.quantity,
      stock: it.product.stock,
    };
  });

  return NextResponse.json({ items });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json()) as { items?: IncomingItem[] };
  const items = (body.items ?? []).filter(
    (i) => typeof i.productId === "string" && Number.isFinite(i.quantity) && i.quantity > 0,
  );

  // Replace the user's cart with the incoming items in a single transaction.
  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
      select: { id: true },
    });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    if (items.length) {
      await tx.cartItem.createMany({
        data: items.map((i) => ({
          cartId: cart.id,
          productId: i.productId,
          quantity: Math.max(1, Math.floor(i.quantity)),
        })),
        skipDuplicates: true,
      });
    }
  });

  return NextResponse.json({ ok: true });
}
