import { prisma } from "@/lib/prisma";
import { CategoriesClient } from "./client";

export default async function AdminCategories() {
  const cats = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return <CategoriesClient initial={cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, count: c._count.products }))} />;
}
