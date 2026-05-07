import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

// Demo password set when an approved trader has no account yet. They sign in
// with this once and are forced to set their own password before continuing.
const DEMO_PASSWORD = "12345678";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = (await req.json()) as { action: "approve" | "reject"; note?: string };
  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }

  const reqRow = await prisma.tradeAccountRequest.findUnique({ where: { id } });
  if (!reqRow) return NextResponse.json({ ok: false }, { status: 404 });

  const status = body.action === "approve" ? "APPROVED" : "REJECTED";

  await prisma.$transaction(async (tx) => {
    await tx.tradeAccountRequest.update({
      where: { id },
      data: {
        status,
        decidedAt: new Date(),
        decidedById: session.user.id,
        decisionNote: body.note?.trim() || null,
      },
    });

    if (status !== "APPROVED") return;

    // 1. Linked user → just flip the trade flag.
    if (reqRow.userId) {
      await tx.user.update({
        where: { id: reqRow.userId },
        data: { tradeApproved: true, tradeApprovedAt: new Date() },
      });
      return;
    }

    // 2. No linked user. Either an existing account with this email exists
    //    (link to it + approve) or we create a fresh account with the demo
    //    password and flag it for forced reset on first login.
    const existing = await tx.user.findUnique({ where: { email: reqRow.email } });
    if (existing) {
      await tx.user.update({
        where: { id: existing.id },
        data: { tradeApproved: true, tradeApprovedAt: new Date() },
      });
      await tx.tradeAccountRequest.update({
        where: { id },
        data: { userId: existing.id },
      });
      return;
    }

    const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
    const created = await tx.user.create({
      data: {
        email: reqRow.email,
        name: reqRow.contactName,
        phone: reqRow.phone,
        address: reqRow.address,
        city: reqRow.city,
        country: reqRow.country,
        password: hashed,
        tradeApproved: true,
        tradeApprovedAt: new Date(),
        mustChangePassword: true,
      },
    });
    await tx.tradeAccountRequest.update({
      where: { id },
      data: { userId: created.id },
    });
  });

  await logActivity(session, {
    action: status === "APPROVED" ? "approved" : "rejected",
    moduleKey: "trade-request",
    target: `${reqRow.companyName} (${reqRow.email})`,
    targetId: id,
  });
  // TODO(email): notify reqRow.email of approval + demo password.
  return NextResponse.json({ ok: true });
}
