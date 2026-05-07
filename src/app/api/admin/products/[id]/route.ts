import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";

const schema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
  price: z.number().positive().optional(),
  costPrice: z.number().nonnegative().nullable().optional(),
  stock: z.number().int().min(0).optional(),
  images: z
    .array(
      z
        .string()
        .min(1)
        .refine(
          (s) => s.startsWith("/") || /^https?:\/\//.test(s),
          "Must be a URL or an internal path",
        ),
    )
    .optional(),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  sku: z.string().nullable().optional(),
  oemNumber: z.string().max(64).nullable().optional(),
  compatibilities: z
    .array(
      z.object({
        bikeModelId: z.string(),
        yearFrom: z.number().int(),
        yearTo: z.number().int(),
      }),
    )
    .optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const compats = d.compatibilities;
  delete d.compatibilities;

  // Snapshot of relevant fields BEFORE the update so we can build a diff.
  const before = await prisma.product.findUnique({
    where: { id },
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true } },
      compatibilities: true,
    },
  });

  const product = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id },
      data: d as Prisma.ProductUncheckedUpdateInput,
    });
    if (compats) {
      await tx.productCompatibility.deleteMany({ where: { productId: id } });
      for (const c of compats) {
        await tx.productCompatibility.create({
          data: { productId: id, ...c },
        });
      }
    }
    return updated;
  });
  revalidatePath("/");
  revalidatePath("/products");
  if (product.slug) revalidatePath(`/products/${product.slug}`);

  // Build a from/to record only for fields that actually changed. We diff
  // scalar fields directly; nested fields (brand, category) are surfaced as
  // their human-readable name when possible. Images/compatibilities are
  // shown as count deltas to keep the log line readable.
  const after = await prisma.product.findUnique({
    where: { id },
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true } },
      compatibilities: true,
    },
  });

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (before && after) {
    const fields = ["name", "description", "sku", "oemNumber", "featured", "active"] as const;
    for (const f of fields) {
      if ((before as Record<string, unknown>)[f] !== (after as Record<string, unknown>)[f]) {
        changes[f] = { from: (before as Record<string, unknown>)[f], to: (after as Record<string, unknown>)[f] };
      }
    }
    if (Number(before.price) !== Number(after.price)) {
      changes.price = { from: Number(before.price), to: Number(after.price) };
    }
    const beforeCost = before.costPrice == null ? null : Number(before.costPrice);
    const afterCost  = after.costPrice  == null ? null : Number(after.costPrice);
    if (beforeCost !== afterCost) {
      changes.costPrice = { from: beforeCost, to: afterCost };
    }
    if (before.stock !== after.stock) {
      changes.stock = { from: before.stock, to: after.stock };
    }
    if (before.lowStockThreshold !== after.lowStockThreshold) {
      changes.lowStockThreshold = { from: before.lowStockThreshold, to: after.lowStockThreshold };
    }
    if (before.brandId !== after.brandId) {
      changes.brand = { from: before.brand?.name ?? before.brandId, to: after.brand?.name ?? after.brandId };
    }
    if (before.categoryId !== after.categoryId) {
      changes.category = { from: before.category?.name ?? before.categoryId, to: after.category?.name ?? after.categoryId };
    }
    if (before.images.length !== after.images.length) {
      changes.images = { from: `${before.images.length} image(s)`, to: `${after.images.length} image(s)` };
    }
    if (compats && before.compatibilities.length !== after.compatibilities.length) {
      changes.compatibilities = {
        from: `${before.compatibilities.length} fitment(s)`,
        to: `${after.compatibilities.length} fitment(s)`,
      };
    }
  }

  await logActivity(await auth(), {
    action: "updated",
    moduleKey: "product",
    target: product.name,
    targetId: product.id,
    meta: Object.keys(changes).length > 0 ? { changes } : undefined,
  });
  return NextResponse.json(product);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const before = await prisma.product.findUnique({ where: { id }, select: { name: true } });
  await prisma.product.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/products");
  await logActivity(await auth(), {
    action: "deleted",
    moduleKey: "product",
    target: before?.name ?? id,
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
