import { cache } from "react";
import { notFound } from "next/navigation";
import { Truck, ShieldCheck, RotateCcw, Package } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { AddToCartButton } from "@/components/AddToCartButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getTradeContext, tradePrice } from "@/lib/trade-pricing";
import { getAncestors } from "@/lib/category-tree";
import type { Metadata } from "next";

// Trade discount must be evaluated per-request, so we can't statically cache.
export const dynamic = "force-dynamic";

// Shared per-request fetch: Next renders `generateMetadata` AND the page in
// the same request, so wrapping in React.cache() collapses the two calls
// into a single Prisma round-trip.
const getProduct = cache((slug: string) =>
  prisma.product.findFirst({
    where: { slug, deletedAt: null },
    include: {
      brand: true,
      category: true,
      compatibilities: {
        include: { bikeModel: { include: { brand: true } } },
        orderBy: { yearTo: "desc" },
      },
    },
  }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Product not found" };
  return {
    title: `${p.name} — ${p.brand.name}`,
    description: p.description.slice(0, 160),
    openGraph: { images: p.images.slice(0, 1) },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p || !p.active) notFound();

  const [trade, ancestors] = await Promise.all([
    getTradeContext(),
    // Orphaned products (no category) have no breadcrumb beyond "All".
    p.categoryId ? getAncestors(p.categoryId) : Promise.resolve([]),
  ]);
  const tp = tradePrice(Number(p.price), p.categoryId, trade);
  const showTrade = tp.percent > 0;

  return (
    <div className="bg-background text-foreground">
      {/* Generous bottom padding so the long fitments/details column
          doesn't crash into the footer on shorter products. */}
      <div className="mx-auto max-w-site px-[var(--gutter)] py-8 pb-16 lg:pb-24">
        <Breadcrumbs
          className="mb-6"
          items={[
            { label: "All Categories", href: "/products" },
            ...ancestors.map((a) => ({
              label: a.name,
              href: `/products?category=${a.path}`,
            })),
            { label: p.name },
          ]}
        />

        {/* Image column is now narrower than the details so the gallery
            sits as a fixed-size visual element and the rich details
            (price, identifiers, CTAs, fitments) get the room they need.
            `items-start` keeps the gallery anchored at the top instead of
            stretching to the height of the long details column. */}
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* Interactive gallery — main image + clickable thumbnails. */}
          <ProductImageGallery
            images={p.images}
            name={p.name}
            featured={p.featured}
            soldOut={p.stock <= 0}
          />

          {/* DETAILS */}
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px]">{p.category?.name ?? "Uncategorised"}</Badge>
                {p.featured && (
                  <Badge variant="warning" className="text-[10px]">Featured</Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight">{p.name}</h1>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              {showTrade ? (
                <>
                  <span className="text-4xl font-bold tabular-nums tracking-tight text-emerald-400">
                    {fmtMoney(tp.discounted)}
                  </span>
                  <span className="text-lg font-medium tabular-nums text-muted-foreground line-through">
                    {fmtMoney(p.price.toString())}
                  </span>
                  <Badge className="bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/15">
                    Trade −{tp.percent}%
                  </Badge>
                </>
              ) : (
                <span className="text-4xl font-bold tabular-nums tracking-tight text-primary">
                  {fmtMoney(p.price.toString())}
                </span>
              )}
              <span className={`text-sm font-medium ${p.stock > 0 ? "text-emerald-400" : "text-destructive"}`}>
                {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
              </span>
            </div>

            <p className="leading-relaxed text-foreground/85">{p.description}</p>

            {/* OEM + SKU spec block */}
            {(p.oemNumber || p.sku) && (
              <Card>
                <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 p-5">
                  {p.oemNumber && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        OEM number
                      </div>
                      <div className="mt-1 font-mono text-base">{p.oemNumber}</div>
                    </div>
                  )}
                  {p.sku && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        SKU / part number
                      </div>
                      <div className="mt-1 font-mono text-base">{p.sku}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cart actions */}
            <AddToCartButton
              product={{
                productId: p.id,
                slug: p.slug,
                name: p.name,
                price: showTrade ? tp.discounted : Number(p.price),
                image: p.images[0],
                stock: p.stock,
              }}
            />

            {/* Trust strip */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <TrustItem icon={Truck} label="Free shipping over £200" />
              <TrustItem icon={RotateCcw} label="30-day returns" />
              <TrustItem icon={ShieldCheck} label="Genuine parts" />
            </div>

            {/* Fitments */}
            {p.compatibilities.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Fits these bikes</h3>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {p.compatibilities.length} fitment{p.compatibilities.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="divide-y divide-border">
                    {p.compatibilities.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-3 py-2.5 text-base"
                      >
                        <div className="min-w-0">
                          {/* Brand name highlighted in the brand red + bumped
                              one size up so the make leads the row visually. */}
                          <span className="text-lg font-semibold text-red">{c.bikeModel.brand.name}</span>{" "}
                          <span className="font-medium">{c.bikeModel.name}</span>
                        </div>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                          {c.yearFrom === c.yearTo
                            ? c.yearFrom
                            : `${c.yearFrom}–${c.yearTo}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustItem({
  icon: Icon, label,
}: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}
