import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";
import { diffFields } from "@/lib/diff";
import { NAV_CACHE_TAG } from "@/lib/nav-cache";
import {
  MAX_CATEGORY_DEPTH, recomputeSubtreePaths, uniqueChildSlug,
} from "@/lib/category-tree";

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const d = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.category.findUnique({
        where: { id },
        select: {
          id: true, name: true, slug: true, parentId: true, depth: true, path: true,
          description: true, imageUrl: true, sortOrder: true,
        },
      });
      if (!before) throw new Error("Not found");

      const data: Record<string, unknown> = {};
      let needsRecompute = false;

      if (d.description !== undefined) data.description = d.description;
      if (d.imageUrl !== undefined) data.imageUrl = d.imageUrl;
      if (d.sortOrder !== undefined) data.sortOrder = d.sortOrder;

      // Move to a different parent. Block cycles (can't make a node its own
      // ancestor) and depth overflow.
      if (d.parentId !== undefined && d.parentId !== before.parentId) {
        if (d.parentId === id) throw new Error("A category cannot be its own parent");
        let newDepth = 0;
        if (d.parentId) {
          const parent = await tx.category.findUnique({
            where: { id: d.parentId },
            select: { path: true, depth: true },
          });
          if (!parent) throw new Error("Parent category not found");
          // Reject moves that would put a node under its own descendant.
          if (parent.path === before.path || parent.path.startsWith(`${before.path}/`)) {
            throw new Error("Cannot move a category into one of its descendants");
          }
          newDepth = parent.depth + 1;
        }
        // Check the full subtree depth fits.
        const subtreeMaxDepth = await tx.category.aggregate({
          where: { OR: [{ id }, { path: { startsWith: `${before.path}/` } }] },
          _max: { depth: true },
        });
        const span = (subtreeMaxDepth._max.depth ?? before.depth) - before.depth;
        if (newDepth + span > MAX_CATEGORY_DEPTH) {
          throw new Error(`Move would exceed maximum depth of ${MAX_CATEGORY_DEPTH}`);
        }
        data.parentId = d.parentId ?? null;
        needsRecompute = true;
      }

      // Rename: regenerate slug (scoped to the resulting parent), then
      // recompute paths so descendants pick up the new ancestor segment.
      if (d.name !== undefined && d.name !== before.name) {
        data.name = d.name.trim();
        const resultingParent = (data.parentId ?? before.parentId) as string | null;
        data.slug = await uniqueChildSlug(tx, resultingParent, d.name, id);
        needsRecompute = true;
      }

      if (Object.keys(data).length > 0) {
        await tx.category.update({ where: { id }, data });
      }
      if (needsRecompute) {
        await recomputeSubtreePaths(tx, id);
      }
      return tx.category.findUnique({ where: { id } });
    });

    revalidateTag(NAV_CACHE_TAG);
    if (updated) {
      const before = updated; // diff is informational only — fetched after-state.
      const changes = diffFields(
        before, updated,
        ["name", "description", "imageUrl", "parentId", "sortOrder"] as const,
      );
      await logActivity(await auth(), {
        action: "updated",
        moduleKey: "category",
        target: updated.name,
        targetId: id,
        meta: Object.keys(changes).length > 0 ? { changes } : undefined,
      });
    }
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
