import { notFound } from "next/navigation";
import { Truck, ShieldCheck, RotateCcw, Package } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { AddToCartButton } from "@/components/AddToCartButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getTradeContext, tradePrice } from "@/lib/trade-pricing";
import type { Metadata } from "next";

// Trade discount must be evaluated per-request, so we can't statically cache.
export const dynamic = "force-dynamic";

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%231C1E21'/></svg>`,
  );

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.product.findUnique({
    where: { slug },
    include: { brand: true, category: true },
  });
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
  const p = await prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
      compatibilities: {
        include: { bikeModel: { include: { brand: true } } },
        orderBy: { yearTo: "desc" },
      },
    },
  });
  if (!p || !p.active) notFound();

  const mainImg = p.images[0] ?? PLACEHOLDER;
  const trade = await getTradeContext();
  const tp = tradePrice(Number(p.price), p.categoryId, trade);
  const showTrade = tp.percent > 0;

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-site px-[var(--gutter)] py-8">
        <Breadcrumbs
          className="mb-6"
          items={[
            { label: "Products", href: "/products" },
            { label: p.category.name, href: `/products?category=${p.category.slug}` },
            { label: p.name },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* IMAGES */}
          <div className="space-y-3">
            <Card className="overflow-hidden">
              <div className="relative aspect-square bg-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mainImg}
                  alt={p.name}
                  className="h-full w-full object-contain p-4"
                />
                {p.featured && (
                  <Badge variant="default" className="absolute left-3 top-3 text-[10px]">
                    Featured
                  </Badge>
                )}
                {p.stock <= 0 && (
                  <Badge variant="destructive" className="absolute right-3 top-3 text-[10px]">
                    Sold out
                  </Badge>
                )}
              </div>
            </Card>
            {p.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {p.images.slice(0, 4).map((src, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="aspect-square bg-secondary">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* DETAILS */}
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <Badge variant="default" className="text-[10px]">{p.brand.name}</Badge>
                <Badge variant="secondary" className="text-[10px]">{p.category.name}</Badge>
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
                        className="flex items-center justify-between gap-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <span className="text-muted-foreground">{c.bikeModel.brand.name}</span>{" "}
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
