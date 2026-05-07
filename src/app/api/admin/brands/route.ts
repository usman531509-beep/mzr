import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";

const schema = z.object({ name: z.string().min(1), logoUrl: z.string().url().optional().nullable() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const brand = await prisma.brand.create({
    data: { name: parsed.data.name, slug: slugify(parsed.data.name), logoUrl: parsed.data.logoUrl || null },
  });
  await logActivity(await auth(), {
    action: "created",
    moduleKey: "brand",
    target: brand.name,
    targetId: brand.id,
  });
  return NextResponse.json(brand);
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const before = await prisma.brand.findUnique({ where: { id }, select: { name: true } });
  await prisma.brand.delete({ where: { id } });
  await logActivity(await auth(), {
    action: "deleted",
    moduleKey: "brand",
    target: before?.name ?? id,
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
