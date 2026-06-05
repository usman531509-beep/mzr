import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";

// Tree-shaped Category helpers. The DB carries `parentId`, `path`, `depth`
// for every row; this module is the single source of truth for keeping
// those three fields in sync whenever a node is created, renamed, or moved.

export const MAX_CATEGORY_DEPTH = 4; // root = depth 0, so 5 effective levels.

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  path: string;
  depth: number;
  sortOrder: number;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
  childCount: number;
};

export type CategoryTreeNode = CategoryNode & { children: CategoryTreeNode[] };

// Join a parent path + child slug into the canonical "a/b/c" path string.
export function joinPath(parentPath: string | null, slug: string): string {
  return parentPath ? `${parentPath}/${slug}` : slug;
}

// Generate a slug that is unique among the parent's existing children.
// Falls back to appending -2, -3, ... if the base slug is taken.
export async function uniqueChildSlug(
  tx: Prisma.TransactionClient,
  parentId: string | null,
  name: string,
  ignoreId?: string,
): Promise<string> {
  const base = slugify(name) || "category";
  let candidate = base;
  let i = 2;
  // We loop because two parallel admins could in theory race; the unique
  // index is the real guard, this just keeps the common case clean.
  while (true) {
    const clash = await tx.category.findFirst({
      where: {
        parentId,
        slug: candidate,
        ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
      },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${base}-${i++}`;
  }
}

// Recompute path + depth for a category and every descendant under it.
// Call inside a transaction after the node's own parentId or slug changes.
export async function recomputeSubtreePaths(
  tx: Prisma.TransactionClient,
  rootId: string,
): Promise<void> {
  const node = await tx.category.findUnique({
    where: { id: rootId },
    select: { id: true, slug: true, parentId: true },
  });
  if (!node) return;

  let parentPath: string | null = null;
  let parentDepth = -1;
  if (node.parentId) {
    const parent = await tx.category.findUnique({
      where: { id: node.parentId },
      select: { path: true, depth: true },
    });
    if (!parent) throw new Error("Parent category not found");
    parentPath = parent.path;
    parentDepth = parent.depth;
  }

  const newPath = joinPath(parentPath, node.slug);
  const newDepth = parentDepth + 1;
  if (newDepth > MAX_CATEGORY_DEPTH) {
    throw new Error(`Category depth exceeds the maximum of ${MAX_CATEGORY_DEPTH}`);
  }
  await tx.category.update({
    where: { id: rootId },
    data: { path: newPath, depth: newDepth },
  });

  // Walk children breadth-first. Each child's new path is parent.path/child.slug.
  const stack: { id: string; path: string; depth: number }[] = [
    { id: rootId, path: newPath, depth: newDepth },
  ];
  while (stack.length) {
    const cur = stack.pop()!;
    const kids = await tx.category.findMany({
      where: { parentId: cur.id },
      select: { id: true, slug: true },
    });
    for (const k of kids) {
      const kPath = joinPath(cur.path, k.slug);
      const kDepth = cur.depth + 1;
      if (kDepth > MAX_CATEGORY_DEPTH) {
        throw new Error(`Category depth exceeds the maximum of ${MAX_CATEGORY_DEPTH}`);
      }
      await tx.category.update({
        where: { id: k.id },
        data: { path: kPath, depth: kDepth },
      });
      stack.push({ id: k.id, path: kPath, depth: kDepth });
    }
  }
}

// Returns the ancestor chain (root → ... → node) for a given category.
// Useful for breadcrumbs on the storefront.
export async function getAncestors(categoryId: string): Promise<
  Array<{ id: string; name: string; slug: string; path: string }>
> {
  // Storefront caller — a soft-deleted category should have no breadcrumb.
  const node = await prisma.category.findFirst({
    where: { id: categoryId, deletedAt: null },
    select: { path: true },
  });
  if (!node) return [];
  const segments = node.path.split("/");
  // Build the sequence of full paths for each segment: ["a", "a/b", "a/b/c"]
  const paths: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    paths.push(segments.slice(0, i + 1).join("/"));
  }
  const rows = await prisma.category.findMany({
    where: { path: { in: paths }, deletedAt: null },
    select: { id: true, name: true, slug: true, path: true, depth: true },
    orderBy: { depth: "asc" },
  });
  return rows;
}

// Resolve a full path (e.g. ["brake","motorcycle-brake-pads"]) to a Category
// row, or null if it doesn't exist. Storefront category route uses this.
export async function findByPath(segments: string[]) {
  if (!segments.length) return null;
  const path = segments.join("/");
  return prisma.category.findFirst({
    where: { path, deletedAt: null },
    select: {
      id: true, name: true, slug: true, path: true, depth: true,
      parentId: true, description: true, imageUrl: true,
    },
  });
}

// Load the entire tree in one query and assemble it into a nested structure.
// Cheap: a single findMany + an in-memory pass.
export async function loadTree(): Promise<CategoryTreeNode[]> {
  // Soft-deleted nodes are hidden — the admin "Deleted" tab loads them
  // through a separate query.
  const rows = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: [{ depth: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, slug: true, parentId: true, path: true,
      depth: true, sortOrder: true, description: true, imageUrl: true,
      _count: {
        select: {
          products: { where: { active: true, deletedAt: null } },
          children: { where: { deletedAt: null } },
        },
      },
    },
  });
  const byId = new Map<string, CategoryTreeNode>();
  for (const r of rows) {
    byId.set(r.id, {
      id: r.id,
      name: r.name,
      slug: r.slug,
      parentId: r.parentId,
      path: r.path,
      depth: r.depth,
      sortOrder: r.sortOrder,
      description: r.description,
      imageUrl: r.imageUrl,
      productCount: r._count.products,
      childCount: r._count.children,
      children: [],
    });
  }
  const roots: CategoryTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId) {
      const parent = byId.get(node.parentId);
      if (parent) parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// Throws if categoryId has any (live) children. Products may only attach to
// a leaf — soft-deleted children don't count, an admin can re-tag a category
// as a leaf once its children are deleted.
export async function assertLeafForProduct(
  tx: Prisma.TransactionClient,
  categoryId: string,
): Promise<void> {
  const childCount = await tx.category.count({
    where: { parentId: categoryId, deletedAt: null },
  });
  if (childCount > 0) {
    throw new Error("Products can only be assigned to leaf categories (no children).");
  }
}

// Given a Prisma ProductWhere filter (e.g. brand=Honda + year=2020+q="oil"),
// return — for each candidate sub-category — the count of products that
// match the filter under that subtree. Lets the storefront surface only
// the sub-categories that actually have something to show the customer
// after they've already filtered by brand/model/year.
export async function countMatchingProductsBySubtree(
  candidates: Array<{ id: string; name: string; path: string }>,
  baseWhere: Prisma.ProductWhereInput,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (candidates.length === 0) return counts;
  // One query for everything that matches the filter, then bucket the
  // resulting category paths into the candidate subtrees. Beats N queries.
  const matches = await prisma.product.findMany({
    where: { ...baseWhere, deletedAt: null },
    select: { category: { select: { path: true } } },
  });
  for (const c of candidates) counts.set(c.path, 0);
  for (const row of matches) {
    // Orphaned products (category soft-deleted) don't contribute to any
    // subtree count — they only surface under the "All products" view.
    if (!row.category) continue;
    const p = row.category.path;
    for (const c of candidates) {
      if (p === c.path || p.startsWith(`${c.path}/`)) {
        counts.set(c.path, (counts.get(c.path) ?? 0) + 1);
      }
    }
  }
  return counts;
}

// Roll up product counts: for every category, return the number of active
// products under it INCLUDING descendants. Used by the nav cache so the
// header can hide empty parents and the home grid can show top-level totals.
export async function rollupProductCounts(): Promise<Map<string, number>> {
  // Single query: for each active product, fetch its category's path.
  const rows = await prisma.product.findMany({
    where: { active: true, deletedAt: null },
    select: { category: { select: { path: true } } },
  });
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.category) continue;
    const segments = r.category.path.split("/");
    for (let i = 1; i <= segments.length; i++) {
      const key = segments.slice(0, i).join("/");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}
