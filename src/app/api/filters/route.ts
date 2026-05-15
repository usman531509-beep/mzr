import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/filters?brand=<id> → returns models for the given brand (cascading
// dropdown). When `brand` is provided we skip the brands fetch entirely since
// the caller already has them — saves a round-trip on every cascade click.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brand");

  const [brands, models] = await Promise.all([
    brandId
      ? Promise.resolve([])
      : prisma.brand.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true },
        }),
    brandId
      ? prisma.bikeModel.findMany({
          where: { brandId },
          orderBy: { name: "asc" },
          select: { id: true, name: true, brandId: true, yearStart: true, yearEnd: true },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({ brands, models });
}
