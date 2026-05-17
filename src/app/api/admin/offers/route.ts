import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { OFFERS_CACHE_TAG } from "@/lib/offers-cache";

export const dynamic = "force-dynamic";

const schema = z.object({
  text: z.string().min(1).max(200),
  icon: z.string().max(8).optional().or(z.literal("")),
  active: z.boolean().optional(),
  position: z.number().int().optional(),
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
      { ok: false, error: `Invalid ${issue?.path.join(".") ?? "input"}: ${issue?.message}` },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // Position defaults to "after the current last offer" so new ones land at
  // the bottom of the bar rather than shoving themselves to the front.
  let position = d.position;
  if (position === undefined) {
    const last = await prisma.offer.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });
    position = (last?.position ?? -1) + 1;
  }

  const created = await prisma.offer.create({
    data: {
      text: d.text.trim(),
      icon: d.icon?.trim() || null,
      active: d.active ?? true,
      position,
    },
    select: { id: true, text: true },
  });

  revalidateTag(OFFERS_CACHE_TAG);
  await logActivity(session, {
    action: "created",
    moduleKey: "offers",
    target: created.text,
    targetId: created.id,
  });
  return NextResponse.json({ ok: true, id: created.id });
}
