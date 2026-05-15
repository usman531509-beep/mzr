import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(120),
  trackingUrl: z.string().url().max(500),
  logoUrl: z.string().url().max(500).optional().or(z.literal("")),
  active: z.boolean().optional(),
});

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return null;
  return session;
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
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
  const name = d.name.trim();
  let slug = slugify(name);
  if (!slug) slug = `courier-${Date.now()}`;

  // Disambiguate slug if a courier already uses it.
  for (let i = 2; i < 50; i++) {
    const exists = await prisma.courier.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) break;
    slug = `${slugify(name)}-${i}`;
  }

  try {
    const created = await prisma.courier.create({
      data: {
        name,
        slug,
        trackingUrl: d.trackingUrl.trim(),
        logoUrl: d.logoUrl?.trim() || null,
        active: d.active ?? true,
      },
      select: { id: true, name: true },
    });
    await logActivity(session, {
      action: "created",
      moduleKey: "courier",
      target: created.name,
      targetId: created.id,
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    const msg = e instanceof Error && /Unique/.test(e.message)
      ? "A courier with that name already exists"
      : "Could not save";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
