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
  description: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const cat = await prisma.category.create({
    data: {
      name: parsed.data.name,
      slug: slugify(parsed.data.name),
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl || null,
    },
  });
  revalidateTag(NAV_CACHE_TAG);
  await logActivity(await auth(), {
    action: "created",
    moduleKey: "category",
    target: cat.name,
    targetId: cat.id,
  });
  return NextResponse.json(cat);
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const before = await prisma.category.findUnique({ where: { id }, select: { name: true } });
  await prisma.category.delete({ where: { id } });
  revalidateTag(NAV_CACHE_TAG);
  await logActivity(await auth(), {
    action: "deleted",
    moduleKey: "category",
    target: before?.name ?? id,
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
