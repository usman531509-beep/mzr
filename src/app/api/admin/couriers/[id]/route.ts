import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { diffFields } from "@/lib/diff";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  trackingUrl: z.string().url().max(500).optional(),
  logoUrl: z.string().url().max(500).nullable().optional().or(z.literal("")),
  active: z.boolean().optional(),
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

  const before = await prisma.courier.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const k of ["name", "trackingUrl", "logoUrl", "active"] as const) {
    if (d[k] !== undefined) data[k] = d[k] === "" ? null : d[k];
  }
  const updated = await prisma.courier.update({ where: { id }, data });

  const changes = diffFields(before, updated, [
    "name", "trackingUrl", "logoUrl", "active",
  ] as const);

  await logActivity(session, {
    action: "updated",
    moduleKey: "courier",
    target: updated.name,
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

  const before = await prisma.courier.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });
  if (!before) return NextResponse.json({ ok: false }, { status: 404 });
  if (before._count.orders > 0) {
    return NextResponse.json(
      { ok: false, error: "Can't delete — courier is attached to orders. Deactivate instead." },
      { status: 400 },
    );
  }
  await prisma.courier.delete({ where: { id } });
  await logActivity(session, {
    action: "deleted",
    moduleKey: "courier",
    target: before.name,
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
