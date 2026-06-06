import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

// Temporary password set when an approved trader has no account yet. They
// sign in with this once and are forced to set their own password before
// continuing. Surfaced to the admin in the approval response so it can be
// communicated to the trader out-of-band (email, phone, etc.).
const DEMO_PASSWORD = "Trader123@";

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

  // Track which branch the approval took so we can return the temp
  // password to the admin only when a new account was actually created.
  // (We never re-leak the password for a pre-existing account.)
  type Outcome = "linked" | "created" | "linked-existing-email" | "rejected";
  // Cast the initial value so TS doesn't narrow the variable's type to the
  // initial literal — the transaction callback below reassigns to "created"
  // or "linked-existing-email" and we need those reads to compile.
  let outcome = (status === "REJECTED" ? "rejected" : "linked") as Outcome;

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
      outcome = "linked";
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
      outcome = "linked-existing-email";
      return;
    }

    const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
    const created = await tx.user.create({
      data: {
        email: reqRow.email,
        name: reqRow.contactName,
        phone: reqRow.phone,
        // Seed the new trader's default shipping address from the business
        // address they entered on the trade-account form. This way the
        // first time they hit checkout, the address is already filled in.
        // Customer can still edit it under /account/profile afterwards.
        address: reqRow.address,
        addressLine2: reqRow.addressLine2,
        city: reqRow.city,
        county: reqRow.county,
        postcode: reqRow.postcode,
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
    outcome = "created";
  });

  await logActivity(session, {
    action: status === "APPROVED" ? "approved" : "rejected",
    moduleKey: "trade-request",
    target: `${reqRow.companyName} (${reqRow.email})`,
    targetId: id,
  });
  // TODO(email): notify reqRow.email of approval + demo password.
  return NextResponse.json({
    ok: true,
    outcome,
    // Only return the temp password on the "created" branch — never for
    // existing accounts (we don't know their current credentials and we
    // don't want to imply otherwise).
    tempPassword: outcome === "created" ? DEMO_PASSWORD : null,
    email: reqRow.email,
  });
}
