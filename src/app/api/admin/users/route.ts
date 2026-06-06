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
  // Full UK postal shape — matches the customer profile + trade-request
  // form. Lets admins drop a brand-new trader straight into the system
  // without a separate "edit profile" round-trip after create.
  address:      z.string().max(500).optional(),
  addressLine2: z.string().max(500).optional(),
  city:         z.string().max(120).optional(),
  county:       z.string().max(120).optional(),
  postcode:     z.string().max(20).optional(),
  country:      z.string().max(120).optional(),
  // Admin opt-in: mark the new account as trade-approved from the start
  // (skips the trade-application flow for known wholesale customers).
  tradeApproved: z.boolean().optional(),
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
        addressLine2: d.addressLine2?.trim() || null,
        city: d.city?.trim() || null,
        county: d.county?.trim() || null,
        // Postcode normalised to uppercase to match the UK convention used
        // elsewhere (customer profile form does the same).
        postcode: d.postcode?.trim().toUpperCase() || null,
        country: d.country?.trim() || null,
        active: true,
        // Trade-approve on create only if the admin explicitly opted in.
        // Keep `tradeApprovedAt` in sync so reports stay accurate.
        tradeApproved: !!d.tradeApproved,
        tradeApprovedAt: d.tradeApproved ? new Date() : null,
      },
      select: { id: true },
    });
    await logActivity(session, {
      action: "created",
      moduleKey: "user",
      target: `${d.name} (${d.email})`,
      targetId: created.id,
      meta: { role: d.role, tradeApproved: !!d.tradeApproved },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique")
      ? "Email already in use"
      : "Could not create user";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
