import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";
import { diffFields } from "@/lib/diff";
import { NAV_CACHE_TAG } from "@/lib/nav-cache";

const schema = z.object({
  name: z.string().min(1).optional(),
  brandId: z.string().optional(),
  yearStart: z.number().int().min(1950).max(2100).optional(),
  yearEnd: z.number().int().min(1950).max(2100).optional(),
  imageUrl: z.string().url().nullable().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const d = parsed.data;

  const before = await prisma.bikeModel.findUnique({
    where: { id },
    include: { brand: { select: { name: true } } },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (d.name !== undefined)      data.name = d.name;
  if (d.brandId !== undefined)   data.brandId = d.brandId;
  if (d.yearStart !== undefined) data.yearStart = d.yearStart;
  if (d.yearEnd !== undefined)   data.yearEnd = d.yearEnd;
  if (d.imageUrl !== undefined)  data.imageUrl = d.imageUrl;
  // Re-slug when name, brand, or year range changed. The year range is
  // included so two same-named rows with different years don't collide
  // on the unique `slug` column.
  if (d.name !== undefined || d.brandId !== undefined || d.yearStart !== undefined || d.yearEnd !== undefined) {
    const brand = await prisma.brand.findUnique({
      where: { id: (d.brandId as string) ?? before.brandId },
      select: { name: true },
    });
    const ys = d.yearStart ?? before.yearStart;
    const ye = d.yearEnd ?? before.yearEnd;
    data.slug = slugify(`${brand?.name ?? ""}-${d.name ?? before.name}-${ys}-${ye}`);
  }

  let updated;
  try {
    updated = await prisma.bikeModel.update({
      where: { id }, data,
      include: { brand: { select: { name: true } } },
    });
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique")
      ? "Another bike model already uses this brand, name and year range."
      : "Could not update bike model";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  revalidateTag(NAV_CACHE_TAG);

  // Build a friendly diff: surface brand by name, not id.
  const changes = diffFields(before, updated, ["name", "yearStart", "yearEnd", "imageUrl"] as const);
  if (before.brandId !== updated.brandId) {
    changes.brand = {
      from: before.brand?.name ?? before.brandId,
      to: updated.brand?.name ?? updated.brandId,
    };
  }

  await logActivity(await auth(), {
    action: "updated",
    moduleKey: "bike-model",
    target: `${updated.brand.name} ${updated.name}`,
    targetId: id,
    meta: Object.keys(changes).length > 0 ? { changes } : undefined,
  });
  return NextResponse.json(updated);
}
