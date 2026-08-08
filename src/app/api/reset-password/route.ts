import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyResetToken } from "@/lib/reset-token";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(6).max(100),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const user = await verifyResetToken(parsed.data.token);
  if (!user) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 },
    );
  }

  const hash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash, mustChangePassword: false },
  });

  return NextResponse.json({ ok: true });
}
