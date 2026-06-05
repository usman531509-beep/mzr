import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";
import { NAV_CACHE_TAG } from "@/lib/nav-cache";
import {
  joinPath, MAX_CATEGORY_DEPTH, uniqueChildSlug,
} from "@/lib/category-tree";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { name, description, imageUrl, parentId, sortOrder } = parsed.data;

  try {
    const created = await prisma.$transaction(async (tx) => {
      let parentPath: string | null = null;
      let parentDepth = -1;
      if (parentId) {
        const parent = await tx.category.findUnique({
          where: { id: parentId },
          select: { path: true, depth: true },
        });
        if (!parent) throw new Error("Parent category not found");
        parentPath = parent.path;
        parentDepth = parent.depth;
      }
      const depth = parentDepth + 1;
      if (depth > MAX_CATEGORY_DEPTH) {
        throw new Error(`Category depth exceeds the maximum of ${MAX_CATEGORY_DEPTH}`);
      }
      const slug = await uniqueChildSlug(tx, parentId ?? null, name);
      return tx.category.create({
        data: {
          name: name.trim(),
          slug,
          parentId: parentId ?? null,
          path: joinPath(parentPath, slug),
          depth,
          sortOrder: sortOrder ?? 0,
          description: description?.trim() || null,
          imageUrl: imageUrl || null,
        },
      });
    });
    revalidateTag(NAV_CACHE_TAG);
    await logActivity(await auth(), {
      action: "created",
      moduleKey: "category",
      target: created.name,
      targetId: created.id,
    });
    return NextResponse.json(created);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create" },
      { status: 400 },
    );
  }
}

// Soft-delete a category. Categories cascade products via the FK; hard
// delete fails any time the subtree has order/PO history. We stamp
// deletedAt and filter the row from every storefront + admin list. The
// live-children / live-products check is preserved so admins can't strand
// a populated subtree — they must move or delete the contents first.
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const cat = await prisma.category.findUnique({
    where: { id },
    select: {
      name: true,
      deletedAt: true,
      _count: {
        select: {
          children: { where: { deletedAt: null } },
          products: { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cat.deletedAt) {
    return NextResponse.json({ ok: true, alreadyDeleted: true });
  }
  if (cat._count.children > 0) {
    return NextResponse.json(
      { error: "This category has sub-categories. Delete or move them first." },
      { status: 400 },
    );
  }
  if (cat._count.products > 0) {
    return NextResponse.json(
      { error: "This category has products. Move them to another category first." },
      { status: 400 },
    );
  }

  await prisma.category.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidateTag(NAV_CACHE_TAG);
  await logActivity(await auth(), {
    action: "deleted",
    moduleKey: "category",
    target: cat.name,
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
