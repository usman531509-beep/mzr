import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { diffFields } from "@/lib/diff";
import { OFFERS_CACHE_TAG } from "@/lib/offers-cache";

export const dynamic = "force-dynamic";

const schema = z.object({
  text: z.string().min(1).max(200).optional(),
  icon: z.string().max(8).nullable().optional().or(z.literal("")),
  active: z.boolean().optional(),
  position: z.number().int().optional(),
});

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return null;
  return session;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await ensureAdmin();
  if (!session) return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  const { id } = await ctx.params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  const d = parsed.data;

  const before = await prisma.offer.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const k of ["text", "icon", "active", "position"] as const) {
    if (d[k] !== undefined) data[k] = d[k] === "" ? null : d[k];
  }
  const updated = await prisma.offer.update({ where: { id }, data });

  const changes = diffFields(before, updated, [
    "text", "icon", "active", "position",
  ] as const);

  revalidateTag(OFFERS_CACHE_TAG);
  await logActivity(session, {
    action: "updated",
    moduleKey: "offers",
    target: updated.text,
    targetId: id,
    meta: Object.keys(changes).length > 0 ? { changes } : undefined,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await ensureAdmin();
  if (!session) return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  const { id } = await ctx.params;

  const before = await prisma.offer.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ ok: false }, { status: 404 });

  await prisma.offer.delete({ where: { id } });

  revalidateTag(OFFERS_CACHE_TAG);
  await logActivity(session, {
    action: "deleted",
    moduleKey: "offers",
    target: before.text,
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
