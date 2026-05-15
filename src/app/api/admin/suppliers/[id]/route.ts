import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { diffFields } from "@/lib/diff";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  contactName: z.string().max(200).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(60).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  country: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
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

  const before = await prisma.supplier.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const k of ["name", "contactName", "email", "phone", "address", "city", "country", "notes", "active"] as const) {
    if (d[k] !== undefined) data[k] = d[k] === "" ? null : d[k];
  }
  const updated = await prisma.supplier.update({ where: { id }, data });

  const changes = diffFields(before, updated, [
    "name", "contactName", "email", "phone", "address", "city", "country", "notes", "active",
  ] as const);

  await logActivity(session, {
    action: "updated",
    moduleKey: "supplier",
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

  const before = await prisma.supplier.findUnique({
    where: { id },
    include: { _count: { select: { purchaseOrders: true } } },
  });
  if (!before) return NextResponse.json({ ok: false }, { status: 404 });
  if (before._count.purchaseOrders > 0) {
    return NextResponse.json(
      { ok: false, error: "Can't delete — supplier has purchase orders. Deactivate instead." },
      { status: 400 },
    );
  }
  await prisma.supplier.delete({ where: { id } });
  await logActivity(session, {
    action: "deleted",
    moduleKey: "supplier",
    target: before.name,
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
