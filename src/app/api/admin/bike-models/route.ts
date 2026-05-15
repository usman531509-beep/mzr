import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";
import { NAV_CACHE_TAG } from "@/lib/nav-cache";

const schema = z.object({
  name: z.string().min(1),
  brandId: z.string(),
  yearStart: z.number().int().min(1950).max(2100),
  yearEnd: z.number().int().min(1950).max(2100),
  imageUrl: z.string().url().optional().nullable(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const brand = await prisma.brand.findUnique({ where: { id: parsed.data.brandId } });
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  // Include the year range in the slug so two models that share the same
  // brand + name but cover different years don't collide on the unique
  // `slug` column.
  const slug = slugify(
    `${brand.name}-${parsed.data.name}-${parsed.data.yearStart}-${parsed.data.yearEnd}`,
  );
  let model;
  try {
    model = await prisma.bikeModel.create({
      data: {
        name: parsed.data.name,
        slug,
        brandId: parsed.data.brandId,
        yearStart: parsed.data.yearStart,
        yearEnd: parsed.data.yearEnd,
        imageUrl: parsed.data.imageUrl || null,
      },
    });
  } catch (e) {
    // P2002 = unique constraint violation. The constraint covers
    // (brandId, name, yearStart, yearEnd) and (slug), so a duplicate trips
    // it whenever the exact same model + year range already exists.
    const msg = e instanceof Error && e.message.includes("Unique")
      ? `A ${brand.name} ${parsed.data.name} already exists for ${parsed.data.yearStart}–${parsed.data.yearEnd}. Use a different year range.`
      : "Could not create bike model";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  revalidateTag(NAV_CACHE_TAG);
  await logActivity(await auth(), {
    action: "created",
    moduleKey: "bike-model",
    target: `${brand.name} ${model.name}`,
    targetId: model.id,
    meta: { changes: {
      yearStart: { from: undefined, to: model.yearStart },
      yearEnd:   { from: undefined, to: model.yearEnd },
    } },
  });
  return NextResponse.json(model);
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const before = await prisma.bikeModel.findUnique({
    where: { id },
    include: { brand: { select: { name: true } } },
  });
  await prisma.bikeModel.delete({ where: { id } });
  revalidateTag(NAV_CACHE_TAG);
  await logActivity(await auth(), {
    action: "deleted",
    moduleKey: "bike-model",
    target: before ? `${before.brand.name} ${before.name}` : id,
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
