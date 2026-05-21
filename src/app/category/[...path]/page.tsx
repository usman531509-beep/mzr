import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageX } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";
import { CompactFilters } from "@/components/CompactFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTradeContext, tradePrice } from "@/lib/trade-pricing";
import { getNavData } from "@/lib/nav-cache";
import { findByPath, getAncestors } from "@/lib/category-tree";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;
type Params = Promise<{ path: string[] }>;

export default async function CategoryPage({
  params, searchParams,
}: {
  params: Params;
  searchParams: SP;
}) {
  const { path: segments } = await params;
  const sp = await searchParams;
  const brandSlug = typeof sp.brand === "string" ? sp.brand : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;

  const node = await findByPath(segments);
  if (!node) notFound();

  // Match products whose own category path starts with this node's path — that
  // gives us the leaf node itself plus every descendant in one shot.
  const where: Prisma.ProductWhereInput = {
    active: true,
    OR: [
      { category: { path: node.path } },
      { category: { path: { startsWith: `${node.path}/` } } },
    ],
  };
  if (brandSlug) where.brand = { slug: brandSlug };
  if (q) {
    where.AND = [{
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { oemNumber: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ],
    }];
  }

  const [trade, nav, products, ancestors, children] = await Promise.all([
    getTradeContext(),
    getNavData(),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        brand: true, category: true,
        compatibilities: {
          include: { bikeModel: { include: { brand: true } } },
          take: 4,
        },
      },
      take: 60,
    }),
    getAncestors(node.id),
    // Show the immediate sub-categories as a quick drill-down strip.
    prisma.category.findMany({
      where: { parentId: node.id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true, name: true, slug: true, path: true, imageUrl: true,
        _count: { select: { products: { where: { active: true } } } },
      },
    }),
  ]);

  const brands = nav.brands;
  const brandById = new Map(brands.map((b) => [b.id, { name: b.name, slug: b.slug }]));
  const allModels = nav.models.map((m) => ({
    ...m,
    brand: brandById.get(m.brandId) ?? { name: "", slug: "" },
  }));

  // Breadcrumb chain: Home / All categories / <ancestor 1> / ... / <self>
  const crumbs: Crumb[] = [{ label: "All Categories", href: "/products" }];
  for (let i = 0; i < ancestors.length; i++) {
    const a = ancestors[i];
    const isLast = i === ancestors.length - 1;
    crumbs.push({ label: a.name, href: isLast ? undefined : `/category/${a.path}` });
  }

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-site px-[var(--gutter)] py-6 lg:py-8">
        <Breadcrumbs className="mb-3" items={crumbs} />

        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{node.name}</h1>
            {node.description && (
              <p className="mt-1 text-sm text-muted-foreground">{node.description}</p>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{products.length}</span>{" "}
            {products.length === 1 ? "result" : "results"}
          </div>
        </div>

        {children.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {children.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.path}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground/85 transition hover:bg-accent hover:text-foreground"
              >
                {c.name}
                <span className="text-[10px] text-muted-foreground">{c._count.products}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="mb-5 border-y border-border py-2.5">
          <CompactFilters brands={brands} models={allModels} categories={nav.categories} />
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 p-16 text-center">
              <PackageX className="h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No products in this category yet</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Try a parent category or browse all parts.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link href="/products">Browse all parts</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => {
              const tp = tradePrice(Number(p.price), p.categoryId, trade);
              return (
                <ProductCard
                  key={p.id}
                  p={{
                    id: p.id,
                    slug: p.slug,
                    name: p.name,
                    price: p.price.toString(),
                    stock: p.stock,
                    images: p.images,
                    brand: p.brand,
                    category: p.category,
                    oemNumber: p.oemNumber,
                    sku: p.sku,
                    fitments: p.compatibilities.map((c) => ({
                      brand: c.bikeModel.brand.name,
                      model: c.bikeModel.name,
                      yearFrom: c.yearFrom,
                      yearTo: c.yearTo,
                    })),
                    tradePrice: tp.percent > 0
                      ? { discounted: tp.discounted, percent: tp.percent }
                      : undefined,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
