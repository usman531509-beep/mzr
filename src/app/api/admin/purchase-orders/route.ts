import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { nextPoNumber } from "@/lib/po-number";

export const dynamic = "force-dynamic";

const lineSchema = z.object({
  productId: z.string().nullable().optional(),
  name: z.string().min(1).max(200),
  sku: z.string().max(120).optional().nullable(),
  unitCost: z.number().nonnegative(),
  quantity: z.number().int().min(1),
});

const schema = z.object({
  supplierId: z.string().min(1),
  status: z.enum(["DRAFT", "PLACED", "RECEIVED", "CANCELLED"]).optional(),
  notes: z.string().max(2000).optional(),
  expectedAt: z.string().optional(), // YYYY-MM-DD
  items: z.array(lineSchema).min(1),
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
      { ok: false, error: `Invalid ${issue?.path?.join(".") ?? "input"}: ${issue?.message ?? "missing"}` },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const supplier = await prisma.supplier.findUnique({ where: { id: d.supplierId } });
  if (!supplier) return NextResponse.json({ ok: false, error: "Supplier not found" }, { status: 400 });

  const total = d.items.reduce((s, it) => s + it.unitCost * it.quantity, 0);
  const expectedAt = d.expectedAt ? parseLocalDate(d.expectedAt) : null;
  if (expectedAt && Number.isNaN(expectedAt.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid expectedAt" }, { status: 400 });
  }
  const status = d.status ?? "DRAFT";

  try {
    const po = await prisma.$transaction(async (tx) => {
      const poNumber = await nextPoNumber(tx);
      const created = await tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: d.supplierId,
          status,
          total,
          notes: d.notes?.trim() || null,
          expectedAt,
          createdByAdminId: session.user.id,
          items: {
            create: d.items.map((it) => ({
              productId: it.productId || null,
              name: it.name.trim(),
              sku: it.sku?.trim() || null,
              unitCost: it.unitCost,
              quantity: it.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // If admin created the PO directly as RECEIVED, increment stock for
      // every line that's linked to a real product.
      if (status === "RECEIVED") {
        for (const it of created.items) {
          if (it.productId) {
            await tx.product.update({
              where: { id: it.productId },
              data: { stock: { increment: it.quantity } },
            });
          }
        }
        await tx.purchaseOrder.update({
          where: { id: created.id },
          data: { stockReceived: true, receivedAt: new Date() },
        });
      }

      return created;
    });

    await logActivity(session, {
      action: "created",
      moduleKey: "purchase-order",
      target: `${po.poNumber} for ${supplier.name}`,
      targetId: po.id,
      meta: { status, total },
    });

    return NextResponse.json({ ok: true, id: po.id, poNumber: po.poNumber });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create purchase order";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

function parseLocalDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return new Date("invalid");
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
