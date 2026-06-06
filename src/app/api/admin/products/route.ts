import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";
import { NAV_CACHE_TAG } from "@/lib/nav-cache";

const compatibilitySchema = z.object({
  bikeModelId: z.string(),
  yearFrom: z.number().int(),
  yearTo: z.number().int(),
});

// Accept either a fully-qualified URL (Cloudinary in prod) or an internal
// path like /uploads/<file>.jpg (local dev disk storage).
const imageUrl = z
  .string()
  .min(1)
  .refine(
    (s) => s.startsWith("/") || /^https?:\/\//.test(s),
    "Must be a URL or an internal path",
  );

const schema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  price: z.number().positive(),
  costPrice: z.number().nonnegative().nullable().optional(),
  stock: z.number().int().min(0),
  images: z.array(imageUrl).default([]),
  // Multi-brand: at least one bike brand is required. The FIRST entry
  // becomes the legacy `brandId` (used everywhere `product.brand.name`
  // shows up); the full list is written to the M2M `brands` relation so
  // the storefront brand filter surfaces this product under every ticked
  // brand. Callers can still send `brandId` alone for backwards-compat.
  brandIds: z.array(z.string()).min(1).optional(),
  brandId: z.string().optional(),
  productBrandId: z.string().nullable().optional(),
  categoryId: z.string(),
  featured: z.boolean().optional(),
  demanding: z.boolean().optional(),
  active: z.boolean().optional(),
  sku: z.string().optional().nullable(),
  oemNumber: z.string().max(64).optional().nullable(),
  compatibilities: z.array(compatibilitySchema).default([]),
}).refine((v) => !!v.brandId || (v.brandIds && v.brandIds.length > 0), {
  message: "Pick at least one bike brand",
  path: ["brandIds"],
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  // Products may only attach to a leaf category. Reject a parent pick early.
  const childCount = await prisma.category.count({ where: { parentId: d.categoryId } });
  if (childCount > 0) {
    return NextResponse.json(
      { error: "Pick a leaf category (one with no sub-categories)." },
      { status: 400 },
    );
  }

  const slug = slugify(d.name) + "-" + Math.random().toString(36).slice(2, 6);

  // We always wrap create + initial-layer in one transaction so the FIFO
  // invariant (SUM(layer.qtyRemaining) === product.stock) is true the
  // moment the row exists. Without this, the first sale of a brand-new
  // in-stock product throws "FIFO: not enough stock layers".
  // Resolve the brand set. New callers send brandIds; old callers can still
  // send brandId alone. Either way, brandIds always includes the primary,
  // de-duped and order-preserving so the first element is the primary.
  const requestedBrandIds = d.brandIds && d.brandIds.length > 0
    ? Array.from(new Set(d.brandIds))
    : (d.brandId ? [d.brandId] : []);
  if (requestedBrandIds.length === 0) {
    return NextResponse.json({ error: "Pick at least one bike brand" }, { status: 400 });
  }
  const primaryBrandId = requestedBrandIds[0];

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        name: d.name,
        slug,
        description: d.description,
        price: d.price,
        costPrice: d.costPrice ?? null,
        stock: d.stock,
        images: d.images,
        brandId: primaryBrandId,
        // M2M: connect every ticked brand. Includes the primary so the
        // relation stays a clean superset of {brandId}.
        brands: { connect: requestedBrandIds.map((bid) => ({ id: bid })) },
        productBrandId: d.productBrandId || null,
        categoryId: d.categoryId,
        featured: d.featured ?? false,
        demanding: d.demanding ?? false,
        active: d.active ?? true,
        sku: d.sku || null,
        oemNumber: d.oemNumber || null,
        compatibilities: {
          create: d.compatibilities.map((c) => ({
            bikeModelId: c.bikeModelId,
            yearFrom: c.yearFrom,
            yearTo: c.yearTo,
          })),
        },
      },
    });
    if (d.stock > 0) {
      await tx.stockLayer.create({
        data: {
          productId: created.id,
          source: "INITIAL",
          unitCost: d.costPrice ?? 0,
          unitRetail: d.price,
          qtyReceived: d.stock,
          qtyRemaining: d.stock,
          notes: "Initial stock at product creation",
        },
      });
    }
    return created;
  });
  revalidatePath("/");
  revalidatePath("/products");
  if (product.slug) revalidatePath(`/products/${product.slug}`);
  revalidateTag(NAV_CACHE_TAG);
  await logActivity(await auth(), {
    action: "created",
    moduleKey: "product",
    target: product.name,
    targetId: product.id,
  });
  return NextResponse.json(product);
}
