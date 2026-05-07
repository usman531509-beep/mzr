import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { diffFields } from "@/lib/diff";

export const dynamic = "force-dynamic";

const schema = z.object({
  active:   z.boolean().optional(),
  name:     z.string().max(120).nullable().optional(),
  email:    z.string().email().optional(),
  phone:    z.string().max(40).nullable().optional(),
  address:  z.string().max(500).nullable().optional(),
  city:     z.string().max(120).nullable().optional(),
  country:  z.string().max(120).nullable().optional(),
  role:     z.enum(["USER", "STAFF", "MANAGER", "ADMIN"]).optional(),
  password: z.string().min(8).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  const { id } = await ctx.params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }
  const d = parsed.data;

  // Self-protection: an admin can't deactivate themselves or demote their own
  // role, otherwise they'd lock themselves out of the admin panel.
  if (id === session.user.id) {
    if (d.active === false) {
      return NextResponse.json(
        { ok: false, error: "You can't deactivate your own account." },
        { status: 400 },
      );
    }
    if (d.role && d.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "You can't change your own role." },
        { status: 400 },
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (d.active   !== undefined) data.active = d.active;
  if (d.name     !== undefined) data.name = d.name;
  if (d.email    !== undefined) data.email = d.email.toLowerCase().trim();
  if (d.phone    !== undefined) data.phone = d.phone;
  if (d.address  !== undefined) data.address = d.address;
  if (d.city     !== undefined) data.city = d.city;
  if (d.country  !== undefined) data.country = d.country;
  if (d.role     !== undefined) data.role = d.role;
  if (d.password) {
    data.password = await bcrypt.hash(d.password, 10);
    // Treat admin-set password as a final value (no forced reset on next sign-in).
    data.mustChangePassword = false;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
  }

  try {
    const before = await prisma.user.findUnique({
      where: { id },
      select: {
        name: true, email: true, role: true, active: true,
        phone: true, address: true, city: true, country: true,
      },
    });
    const updated = await prisma.user.update({
      where: { id }, data,
      select: {
        name: true, email: true, role: true, active: true,
        phone: true, address: true, city: true, country: true,
      },
    });
    const action = d.active === false ? "deactivated"
      : d.active === true ? "activated"
      : d.password ? "password-reset"
      : d.role && before?.role !== updated.role ? "role-changed"
      : "updated";

    const changes = diffFields(before, updated, [
      "name", "email", "role", "active", "phone", "address", "city", "country",
    ] as const);
    if (d.password) changes.password = { from: "—", to: "•••••• (changed)" };

    await logActivity(session, {
      action,
      moduleKey: "user",
      target: updated.name ?? updated.email,
      targetId: id,
      meta: Object.keys(changes).length > 0 ? { changes } : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique")
      ? "Email already in use"
      : "Could not update user";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
