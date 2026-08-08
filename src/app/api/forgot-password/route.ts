import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createResetToken } from "@/lib/reset-token";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  let devLink: string | undefined;
  if (user) {
    const token = createResetToken(user.id, user.password);
    const origin = new URL(req.url).origin;
    const link = `${origin}/reset-password?token=${encodeURIComponent(token)}`;

    // TODO(email): send `link` to the user via the mail provider once it's
    // wired up. Until then we log it (server) and, in development, return it so
    // the flow is fully testable without email.
    console.log(`[forgot-password] reset link for ${email}:\n${link}`);
    if (process.env.NODE_ENV !== "production") devLink = link;
  }

  // Always generic so the endpoint never reveals whether an email is registered.
  return NextResponse.json({ ok: true, devLink });
}
