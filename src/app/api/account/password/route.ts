import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await req.json()) as { newPassword?: string; currentPassword?: string };
  const newPassword = String(body.newPassword ?? "");
  if (newPassword.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ ok: false }, { status: 404 });

  // If this is a normal change (user is not in forced-reset state), require
  // the current password. The forced-reset flow can skip it because the user
  // just authenticated with the demo password.
  if (!user.mustChangePassword) {
    const currentPassword = String(body.currentPassword ?? "");
    if (!currentPassword) {
      return NextResponse.json(
        { ok: false, error: "Current password is required." },
        { status: 400 },
      );
    }
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Current password is incorrect." },
        { status: 400 },
      );
    }
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, mustChangePassword: false },
  });

  return NextResponse.json({ ok: true });
}
