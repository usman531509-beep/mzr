import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ users: [] }, { status: 403 });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  const where: Prisma.UserWhereInput = { active: true };
  if (q) {
    where.OR = [
      { name:  { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    take: 20,
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, email: true, phone: true,
      address: true, city: true, country: true,
      tradeApproved: true,
    },
  });
  return NextResponse.json({ users });
}
