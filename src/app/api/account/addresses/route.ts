import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  label:         z.string().max(60).nullable().optional(),
  recipientName: z.string().min(1).max(120),
  phone:         z.string().max(60).nullable().optional(),
  line1:         z.string().min(1).max(200),
  line2:         z.string().max(200).nullable().optional(),
  city:          z.string().min(1).max(120),
  county:        z.string().max(120).nullable().optional(),
  postcode:      z.string().min(3).max(20),
  country:       z.string().min(1).max(120),
  isDefault:     z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ ok: true, addresses });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: `Invalid ${issue?.path.join(".") ?? "input"}: ${issue?.message}` },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const userId = session.user.id;

  // Honour the "default" checkbox literally — only mark the new address as
  // the default when the customer explicitly ticked it. The previous auto-
  // default-the-first-address rule was confusing: customers who deliberately
  // left the box empty still saw their address flagged as default and
  // pre-filled at checkout. If they want a default they tick the box.
  const wantDefault = d.isDefault === true;
  const created = await prisma.$transaction(async (tx) => {
    if (wantDefault) {
      // Demote any existing default first so we don't end up with two.
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.address.create({
      data: {
        userId,
        label:         d.label?.trim() || null,
        recipientName: d.recipientName.trim(),
        phone:         d.phone?.trim() || null,
        line1:         d.line1.trim(),
        line2:         d.line2?.trim() || null,
        city:          d.city.trim(),
        county:        d.county?.trim() || null,
        postcode:      d.postcode.trim().toUpperCase(),
        country:       d.country.trim(),
        isDefault:     wantDefault,
      },
    });
  });

  return NextResponse.json({ ok: true, address: created });
}
