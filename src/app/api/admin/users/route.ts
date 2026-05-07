import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

const schema = z.object({
  name:     z.string().min(1).max(120),
  email:    z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role:     z.enum(["USER", "STAFF", "MANAGER", "ADMIN"]).default("USER"),
  phone:    z.string().max(40).optional(),
  address:  z.string().max(500).optional(),
  city:     z.string().max(120).optional(),
  country:  z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.join(".") || "input";
    return NextResponse.json(
      { ok: false, error: `Invalid ${field}: ${issue?.message ?? "missing"}` },
      { status: 400 },
    );
  }
  const d = parsed.data;

  try {
    const created = await prisma.user.create({
      data: {
        name: d.name.trim(),
        email: d.email.toLowerCase().trim(),
        password: await bcrypt.hash(d.password, 10),
        role: d.role,
        phone: d.phone?.trim() || null,
        address: d.address?.trim() || null,
        city: d.city?.trim() || null,
        country: d.country?.trim() || null,
        active: true,
      },
      select: { id: true },
    });
    await logActivity(session, {
      action: "created",
      moduleKey: "user",
      target: `${d.name} (${d.email})`,
      targetId: created.id,
      meta: { role: d.role },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique")
      ? "Email already in use"
      : "Could not create user";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
