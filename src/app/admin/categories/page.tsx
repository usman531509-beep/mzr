import { loadTree } from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { CategoriesClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  // The live tree filters deletedAt: null inside loadTree(). For the Deleted
  // tab we want only the *roots* of each cascade — i.e. categories whose
  // parent is either null or still live. A sub-category that was wiped along
  // with its parent shouldn't appear as a separate restore handle, since
  // restoring the parent brings the whole subtree back in one go.
  const [tree, deletedRows, brands, productBrands, categoriesFlat, models] = await Promise.all([
    loadTree(),
    prisma.category.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      select: {
        id: true, name: true, slug: true, path: true, depth: true,
        parentId: true, deletedAt: true,
        parent: { select: { deletedAt: true } },
      },
    }),
    // Everything the shared "Add a new part" dialog needs to open inline here.
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.productBrand.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ depth: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true, name: true, slug: true, parentId: true, path: true,
        _count: { select: { children: { where: { deletedAt: null } } } },
      },
    }),
    prisma.bikeModel.findMany({
      orderBy: [{ brandId: "asc" }, { name: "asc" }],
      include: { brand: true },
    }),
  ]);

  // Collapse to deletion roots only.
  const roots = deletedRows.filter((d) => !d.parentId || d.parent?.deletedAt == null);
  const rootPaths = roots.map((r) => r.path);

  // For each root, count:
  //   • cascadeSubCount   — deleted sub-categories that would come back
  //   • orphanedProductCount — live products currently parked on
  //     savedCategoryId pointing at this subtree, waiting to be rehomed
  //
  // Products aren't soft-deleted any more (the new contract: deleting a
  // category orphans its products instead), so the second count drives the
  // "restoring brings back X products" preview.
  const cascadeCats = rootPaths.length === 0
    ? []
    : await prisma.category.findMany({
        where: {
          deletedAt: { not: null },
          OR: rootPaths.map((p) => ({ path: { startsWith: `${p}/` } })),
        },
        select: { path: true },
      });
  const pendingProducts = rootPaths.length === 0
    ? []
    : await prisma.product.findMany({
        where: {
          categoryId: null,
          savedCategoryId: { not: null },
          savedCategory: {
            OR: roots.flatMap((r) => [
              { id: r.id },
              { path: { startsWith: `${r.path}/` } },
            ]),
          },
        },
        select: { savedCategory: { select: { path: true } } },
      });

  const subCountByRoot = new Map<string, number>();
  for (const c of cascadeCats) {
    const root = roots.find((r) => c.path.startsWith(`${r.path}/`));
    if (root) subCountByRoot.set(root.id, (subCountByRoot.get(root.id) ?? 0) + 1);
  }
  const prodCountByRoot = new Map<string, number>();
  for (const p of pendingProducts) {
    const path = p.savedCategory?.path;
    if (!path) continue;
    const root = roots.find((r) => path === r.path || path.startsWith(`${r.path}/`));
    if (root) prodCountByRoot.set(root.id, (prodCountByRoot.get(root.id) ?? 0) + 1);
  }

  return (
    <CategoriesClient
      initial={tree}
      deleted={roots.map((d) => ({
        id: d.id,
        name: d.name,
        path: d.path,
        depth: d.depth,
        deletedAt: d.deletedAt!.toISOString(),
        cascadeSubCount: subCountByRoot.get(d.id) ?? 0,
        cascadeProductCount: prodCountByRoot.get(d.id) ?? 0,
      }))}
      brands={brands.map((b) => ({ id: b.id, name: b.name }))}
      productBrands={productBrands.map((b) => ({ id: b.id, name: b.name }))}
      categories={categoriesFlat.map((c) => ({
        id: c.id, name: c.name, slug: c.slug,
        parentId: c.parentId, path: c.path, childCount: c._count.children,
      }))}
      models={models.map((m) => ({
        id: m.id, name: m.name, brandId: m.brandId,
        yearStart: m.yearStart, yearEnd: m.yearEnd,
        brand: { name: m.brand.name },
      }))}
    />
  );
}
