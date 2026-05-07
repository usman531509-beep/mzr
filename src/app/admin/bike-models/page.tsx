import { prisma } from "@/lib/prisma";
import { BikeModelsClient } from "./client";

export default async function AdminBikeModels() {
  const [models, brands] = await Promise.all([
    prisma.bikeModel.findMany({
      orderBy: [{ brandId: "asc" }, { name: "asc" }],
      include: { brand: true, _count: { select: { compatibilities: true } } },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <BikeModelsClient
      initial={models.map((m) => ({
        id: m.id,
        name: m.name,
        brand: m.brand.name,
        brandId: m.brandId,
        yearStart: m.yearStart,
        yearEnd: m.yearEnd,
        count: m._count.compatibilities,
      }))}
      brands={brands.map((b) => ({ id: b.id, name: b.name }))}
    />
  );
}
