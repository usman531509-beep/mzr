import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/filters?brand=<id> → returns models for a brand (cascading dropdown)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brand");

  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });
  const models = brandId
    ? await prisma.bikeModel.findMany({
        where: { brandId },
        orderBy: { name: "asc" },
      })
    : [];

  return NextResponse.json({ brands, models });
}
