import { loadTree } from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { CategoriesClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  // The tree only contains live categories (loadTree filters deletedAt: null).
  // The Deleted tab needs a separate flat list — soft-deleted nodes don't
  // necessarily form a connected subtree, so showing them as a list with the
  // full path is the most useful shape.
  const [tree, deleted] = await Promise.all([
    loadTree(),
    prisma.category.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      select: {
        id: true, name: true, slug: true, path: true, depth: true,
        parentId: true, deletedAt: true,
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    }),
  ]);
  return (
    <CategoriesClient
      initial={tree}
      deleted={deleted.map((d) => ({
        id: d.id,
        name: d.name,
        path: d.path,
        depth: d.depth,
        deletedAt: d.deletedAt!.toISOString(),
        liveProductCount: d._count.products,
      }))}
    />
  );
}
