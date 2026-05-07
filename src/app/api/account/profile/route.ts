import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  newPassword: z.string().min(6).max(100).optional(),
  currentPassword: z.string().min(6).max(100).optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;

  if (d.newPassword) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!d.currentPassword) return NextResponse.json({ error: "Current password required" }, { status: 400 });
    const ok = await bcrypt.compare(d.currentPassword, user.password);
    if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (d.name !== undefined) data.name = d.name;
  if (d.phone !== undefined) data.phone = d.phone || null;
  if (d.address !== undefined) data.address = d.address || null;
  if (d.city !== undefined) data.city = d.city || null;
  if (d.country !== undefined) data.country = d.country || null;
  if (d.newPassword) data.password = await bcrypt.hash(d.newPassword, 10);

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, email: true, phone: true, address: true, city: true, country: true },
  });
  return NextResponse.json(user);
}
