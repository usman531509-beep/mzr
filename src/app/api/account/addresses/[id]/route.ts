import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  label:         z.string().max(60).nullable().optional(),
  recipientName: z.string().min(1).max(120).optional(),
  phone:         z.string().max(60).nullable().optional(),
  line1:         z.string().min(1).max(200).optional(),
  line2:         z.string().max(200).nullable().optional(),
  city:          z.string().min(1).max(120).optional(),
  county:        z.string().max(120).nullable().optional(),
  postcode:      z.string().min(3).max(20).optional(),
  country:       z.string().min(1).max(120).optional(),
  isDefault:     z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await ctx.params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  const d = parsed.data;
  const userId = session.user.id;

  // Confirm ownership before touching anything.
  const existing = await prisma.address.findUnique({ where: { id }, select: { userId: true } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (d.label         !== undefined) data.label         = d.label === "" ? null : d.label?.trim() ?? null;
  if (d.recipientName !== undefined) data.recipientName = d.recipientName.trim();
  if (d.phone         !== undefined) data.phone         = d.phone === "" ? null : d.phone?.trim() ?? null;
  if (d.line1         !== undefined) data.line1         = d.line1.trim();
  if (d.line2         !== undefined) data.line2         = d.line2 === "" ? null : d.line2?.trim() ?? null;
  if (d.city          !== undefined) data.city          = d.city.trim();
  if (d.county        !== undefined) data.county        = d.county === "" ? null : d.county?.trim() ?? null;
  if (d.postcode      !== undefined) data.postcode      = d.postcode.trim().toUpperCase();
  if (d.country       !== undefined) data.country       = d.country.trim();

  // Default flag changes are handled in a transaction so only one row stays
  // true at any moment.
  await prisma.$transaction(async (tx) => {
    if (d.isDefault === true) {
      await tx.address.updateMany({
        where: { userId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
      data.isDefault = true;
    } else if (d.isDefault === false) {
      data.isDefault = false;
    }
    if (Object.keys(data).length > 0) {
      await tx.address.update({ where: { id }, data });
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  const target = await prisma.address.findUnique({
    where: { id },
    select: { userId: true, isDefault: true },
  });
  if (!target || target.userId !== userId) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });
    // If we just removed the default, promote the most-recently-created
    // remaining address so the customer always has one default to fall
    // back on at checkout.
    if (target.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (next) {
        await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
