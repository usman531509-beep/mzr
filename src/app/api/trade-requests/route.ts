import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Body = {
  contactName: string;
  email: string;
  phone: string;
  companyName: string;
  companyWebsite?: string;
  vatNumber?: string;
  businessType?: string;
  monthlyVolume?: string;
  address: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  notes?: string;
};

export async function POST(req: Request) {
  // Single try/catch around the whole flow so a Prisma error (column drift,
  // constraint clash, etc.) surfaces a useful message to the client instead
  // of an opaque 500. Without this any throw bubbles as "Internal server
  // error" with no clue what failed.
  try {
    const session = await auth();
    const body = (await req.json().catch(() => null)) as Partial<Body> | null;
    if (!body) {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const required: (keyof Body)[] = [
      "contactName", "email", "phone", "companyName", "address",
    ];
    for (const k of required) {
      if (!body[k] || typeof body[k] !== "string" || !(body[k] as string).trim()) {
        return NextResponse.json({ ok: false, error: `Missing ${k}` }, { status: 400 });
      }
    }

    // Block duplicate pending requests from the same email.
    const existing = await prisma.tradeAccountRequest.findFirst({
      where: { email: body.email!.toLowerCase().trim(), status: "PENDING" },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "You already have a pending request." },
        { status: 409 },
      );
    }

    const created = await prisma.tradeAccountRequest.create({
      data: {
        userId: session?.user?.id ?? null,
        contactName: body.contactName!.trim(),
        email: body.email!.toLowerCase().trim(),
        phone: body.phone!.trim(),
        companyName: body.companyName!.trim(),
        companyWebsite: body.companyWebsite?.trim() || null,
        vatNumber: body.vatNumber?.trim() || null,
        businessType: body.businessType?.trim() || null,
        monthlyVolume: body.monthlyVolume?.trim() || null,
        address: body.address!.trim(),
        addressLine2: body.addressLine2?.trim() || null,
        city: body.city?.trim() || null,
        county: body.county?.trim() || null,
        postcode: body.postcode?.trim().toUpperCase() || null,
        country: body.country?.trim() || "United Kingdom",
        notes: body.notes?.trim() || null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Trade request failed";
    // Log full error server-side so we can dig deeper if needed.
    console.error("[trade-requests] POST failed:", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
