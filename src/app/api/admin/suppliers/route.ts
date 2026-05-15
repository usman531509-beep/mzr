import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(200),
  contactName: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(60).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
});

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return null;
  return session;
}

export async function POST(req: Request) {
  const session = await ensureAdmin();
  if (!session) return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: `Invalid ${issue?.path?.join(".")}: ${issue?.message}` },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const created = await prisma.supplier.create({
    data: {
      name: d.name.trim(),
      contactName: d.contactName?.trim() || null,
      email: d.email?.trim() || null,
      phone: d.phone?.trim() || null,
      address: d.address?.trim() || null,
      city: d.city?.trim() || null,
      country: d.country?.trim() || null,
      notes: d.notes?.trim() || null,
    },
    select: { id: true, name: true },
  });
  await logActivity(session, {
    action: "created",
    moduleKey: "supplier",
    target: created.name,
    targetId: created.id,
  });
  return NextResponse.json({ ok: true, id: created.id });
}
