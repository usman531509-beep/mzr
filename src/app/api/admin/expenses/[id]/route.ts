import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { diffFields } from "@/lib/diff";

export const dynamic = "force-dynamic";

function parseLocalDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return new Date("invalid");
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const schema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(80).optional(),
  amount: z.number().positive().optional(),
  paidOn: z.string().min(1).optional(),
  vendor: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return null;
  return session;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const d = parsed.data;
  const data: Record<string, unknown> = {};
  if (d.title !== undefined)         data.title = d.title.trim();
  if (d.category !== undefined)      data.category = d.category.trim();
  if (d.amount !== undefined)        data.amount = d.amount;
  if (d.vendor !== undefined)        data.vendor = d.vendor.trim() || null;
  if (d.paymentMethod !== undefined) data.paymentMethod = d.paymentMethod.trim() || null;
  if (d.notes !== undefined)         data.notes = d.notes.trim() || null;
  if (d.paidOn !== undefined) {
    const paidOn = parseLocalDate(d.paidOn);
    if (Number.isNaN(paidOn.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid date" }, { status: 400 });
    }
    data.paidOn = paidOn;
  }
  const before = await prisma.expense.findUnique({ where: { id } });
  const updated = await prisma.expense.update({ where: { id }, data });
  const changes = diffFields(before, updated, [
    "title", "category", "amount", "paidOn",
    "vendor", "paymentMethod", "notes",
  ] as const);
  await logActivity(await auth(), {
    action: "updated",
    moduleKey: "expense",
    target: `${updated.category}: ${updated.title}`,
    targetId: id,
    meta: Object.keys(changes).length > 0 ? { changes } : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false }, { status: 403 });
  const { id } = await ctx.params;
  const before = await prisma.expense.findUnique({ where: { id }, select: { title: true, category: true } });
  await prisma.expense.delete({ where: { id } });
  await logActivity(await auth(), {
    action: "deleted",
    moduleKey: "expense",
    target: before ? `${before.category}: ${before.title}` : id,
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
