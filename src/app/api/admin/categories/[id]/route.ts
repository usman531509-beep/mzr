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
  description: z.string().nullable().optional(),
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
  const data: Record<string, unknown> = {};
  if (d.name !== undefined) {
    data.name = d.name;
    data.slug = slugify(d.name);
  }
  if (d.description !== undefined) data.description = d.description;
  if (d.imageUrl !== undefined) data.imageUrl = d.imageUrl;

  const before = await prisma.category.findUnique({ where: { id } });
  const updated = await prisma.category.update({ where: { id }, data });
  revalidateTag(NAV_CACHE_TAG);
  const changes = diffFields(before, updated, ["name", "description", "imageUrl"] as const);
  await logActivity(await auth(), {
    action: "updated",
    moduleKey: "category",
    target: updated.name,
    targetId: id,
    meta: Object.keys(changes).length > 0 ? { changes } : undefined,
  });
  return NextResponse.json(updated);
}
