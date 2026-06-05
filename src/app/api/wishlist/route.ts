import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ items: [] }, { status: 401 });

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        orderBy: { createdAt: "desc" },
        // Drop wishlist lines whose product was soft-deleted in the admin —
        // the snapshot row stays in the DB for audit, but customers see the
        // wishlist as if the item never existed.
        where: { product: { deletedAt: null } },
      },
    },
  });

  return NextResponse.json({
    items: (wishlist?.items ?? []).map((it) => ({
      id: it.id,
      productId: it.productId,
      name: it.productName,
      slug: it.productSlug,
      price: Number(it.productPrice),
      image: it.productImage,
      brand: it.productBrand,
      addedAt: it.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in to use the wishlist" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { productId?: string } | null;
  if (!body?.productId) {
    return NextResponse.json({ ok: false, error: "productId required" }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: body.productId, deletedAt: null },
    include: { brand: true },
  });
  if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

  const wishlist = await prisma.wishlist.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
    select: { id: true },
  });

  // Idempotent — adding an already-saved product is a no-op.
  await prisma.wishlistItem.upsert({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId: product.id } },
    create: {
      wishlistId: wishlist.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productPrice: product.price,
      productImage: product.images[0] ?? null,
      productBrand: product.brand.name,
    },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  if (!productId) return NextResponse.json({ ok: false }, { status: 400 });

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!wishlist) return NextResponse.json({ ok: true });

  await prisma.wishlistItem.deleteMany({
    where: { wishlistId: wishlist.id, productId },
  });
  return NextResponse.json({ ok: true });
}
