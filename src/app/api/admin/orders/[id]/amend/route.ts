import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { diffFields } from "@/lib/diff";

export const dynamic = "force-dynamic";

const schema = z.object({
  customerName:  z.string().min(1).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().min(1).optional(),
  shippingAddress:      z.string().min(1).optional(),
  shippingAddressLine2: z.string().nullable().optional(),
  shippingCity:         z.string().min(1).optional(),
  shippingCounty:       z.string().nullable().optional(),
  shippingPostcode:     z.string().nullable().optional(),
  shippingCountry:      z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }
  const d = parsed.data;
  if (Object.keys(d).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
  }

  const before = await prisma.order.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // Normalise the optional UK address fields: empty string → null so we
  // don't store stray placeholder values.
  const data: Record<string, unknown> = { ...d };
  for (const k of ["shippingAddressLine2", "shippingCounty", "shippingPostcode"] as const) {
    if (data[k] === "" || data[k] === undefined) continue;
    if (typeof data[k] === "string") {
      data[k] = k === "shippingPostcode"
        ? (data[k] as string).trim().toUpperCase() || null
        : (data[k] as string).trim() || null;
    }
  }

  const updated = await prisma.order.update({ where: { id }, data });

  const changes = diffFields(before, updated, [
    "customerName", "customerEmail", "customerPhone",
    "shippingAddress", "shippingAddressLine2", "shippingCity",
    "shippingCounty", "shippingPostcode", "shippingCountry", "notes",
  ] as const);

  await logActivity(session, {
    action: "amended",
    moduleKey: "order",
    target: `Order ${updated.orderNumber ?? `#${updated.id.slice(0, 8)}`}`,
    targetId: id,
    meta: Object.keys(changes).length > 0 ? { changes } : undefined,
  });

  return NextResponse.json({ ok: true });
}
