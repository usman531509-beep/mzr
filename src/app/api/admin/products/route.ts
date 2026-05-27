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
  brandId: z.string(),
  categoryId: z.string(),
  featured: z.boolean().optional(),
  demanding: z.boolean().optional(),
  active: z.boolean().optional(),
  sku: z.string().optional().nullable(),
  oemNumber: z.string().max(64).optional().nullable(),
  compatibilities: z.array(compatibilitySchema).default([]),
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

  const product = await prisma.product.create({
    data: {
      name: d.name,
      slug,
      description: d.description,
      price: d.price,
      costPrice: d.costPrice ?? null,
      stock: d.stock,
      images: d.images,
      brandId: d.brandId,
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
