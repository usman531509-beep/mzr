import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

// Parse YYYY-MM-DD as local midnight. Used for paidOn so the date the admin
// picked in their browser is stored as that calendar day in their tz.
function parseLocalDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return new Date("invalid");
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const schema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(80),
  amount: z.number().positive(),
  paidOn: z.string().min(1), // YYYY-MM-DD
  vendor: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Admin sign-in required" },
      { status: 403 },
    );
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
  // Parse the YYYY-MM-DD value as **local** midnight, not UTC. Without this,
  // a user west of UTC would save today's expense at a UTC instant that's
  // technically "yesterday" in their timezone, causing the row to fall outside
  // the dashboard's "Today" filter.
  const paidOn = parseLocalDate(d.paidOn);
  if (Number.isNaN(paidOn.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid date" }, { status: 400 });
  }
  const created = await prisma.expense.create({
    data: {
      title: d.title.trim(),
      category: d.category.trim(),
      amount: d.amount,
      paidOn,
      vendor: d.vendor?.trim() || null,
      paymentMethod: d.paymentMethod?.trim() || null,
      notes: d.notes?.trim() || null,
      createdByAdminId: session.user.id,
    },
    select: { id: true },
  });
  await logActivity(session, {
    action: "created",
    moduleKey: "expense",
    target: `${d.category}: ${d.title}`,
    targetId: created.id,
    meta: { amount: d.amount },
  });
  return NextResponse.json({ ok: true, id: created.id });
}
