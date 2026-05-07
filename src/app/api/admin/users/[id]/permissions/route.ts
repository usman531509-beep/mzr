import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ALL_MODULE_KEYS } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

const schema = z.object({
  permissions: z.array(z.string()),
});

export async function PUT(
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
  // Whitelist against the canonical list so unknown keys can't sneak in.
  const allowed = new Set(ALL_MODULE_KEYS);
  const filtered = parsed.data.permissions.filter((k) => allowed.has(k as never));

  const updated = await prisma.user.update({
    where: { id },
    data: { permissions: filtered },
    select: { name: true, email: true },
  });
  await logActivity(session, {
    action: "permissions-updated",
    moduleKey: "user",
    target: updated.name ?? updated.email,
    targetId: id,
    meta: { permissions: filtered },
  });
  return NextResponse.json({ ok: true });
}
