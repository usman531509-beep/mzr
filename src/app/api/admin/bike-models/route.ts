import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";

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
  const model = await prisma.bikeModel.create({
    data: {
      name: parsed.data.name,
      slug: slugify(`${brand.name}-${parsed.data.name}`),
      brandId: parsed.data.brandId,
      yearStart: parsed.data.yearStart,
      yearEnd: parsed.data.yearEnd,
      imageUrl: parsed.data.imageUrl || null,
    },
  });
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
  await logActivity(await auth(), {
    action: "deleted",
    moduleKey: "bike-model",
    target: before ? `${before.brand.name} ${before.name}` : id,
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
