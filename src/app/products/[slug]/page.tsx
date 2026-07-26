import { cache } from "react";
import { notFound } from "next/navigation";
import { Truck, ShieldCheck, RotateCcw } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { AddToCartButton } from "@/components/AddToCartButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { WishlistButton } from "@/components/WishlistButton";
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

  const stockPillClass =
    p.stock <= 0 ? "stock-pill out" : p.stock <= 5 ? "stock-pill low" : "stock-pill";
  const stockLabel =
    p.stock <= 0
      ? "Out of stock"
      : p.stock <= 5
        ? `Low stock · ${p.stock} left`
        : `In stock · ${p.stock}`;

  return (
    <div className="bg-white text-ink">
      {/* Generous bottom padding so the tabs/description block doesn't
          crash into the footer on shorter products. */}
      <div className="mx-auto max-w-site px-[var(--gutter)] py-6 pb-16 lg:pb-24">
        <Breadcrumbs
          className="mb-5"
          items={[
            { label: "All Categories", href: "/products" },
            ...ancestors.map((a) => ({
              label: a.name,
              href: `/products?category=${a.path}`,
            })),
            { label: p.name },
          ]}
        />

        {/* Reference two-column PDP grid: gallery left, details right. */}
        <div className="pdp">
          {/* Interactive gallery — main image + clickable thumbnails. */}
          <ProductImageGallery
            images={p.images}
            name={p.name}
            featured={p.featured}
            soldOut={p.stock <= 0}
          />

          {/* DETAILS */}
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="tag-inline">{p.brand.name}</span>
              {p.featured && (
                <span
                  className="tag-inline"
                  style={{ background: "#fff4d6", color: "#b8860b" }}
                >
                  Featured
                </span>
              )}
            </div>

            <h1>{p.name}</h1>

            <div className="meta">
              Brand: <b>{p.brand.name}</b> · Category:{" "}
              {p.category?.name ?? "Uncategorised"}
              {p.sku && (
                <>
                  {" "}· SKU: <span className="kbd">{p.sku}</span>
                </>
              )}
              {p.oemNumber && (
                <>
                  {" "}· OEM: <span className="kbd">{p.oemNumber}</span>
                </>
              )}
            </div>

            <div className="price-big">
              {showTrade ? (
                <>
                  <span className="old">{fmtMoney(p.price.toString())}</span>
                  {fmtMoney(tp.discounted)}
                  <span
                    style={{
                      fontSize: 14,
                      color: "var(--ok)",
                      fontWeight: 700,
                      marginLeft: 8,
                    }}
                  >
                    Trade · save {tp.percent}%
                  </span>
                </>
              ) : (
                fmtMoney(p.price.toString())
              )}
            </div>

            <div className="flex">
              <span className={stockPillClass}>{stockLabel}</span>
              {p.stock > 0 && (
                <span className="muted" style={{ fontSize: 13 }}>
                  Dispatched same day before 3pm
                </span>
              )}
            </div>

            {/* Fitment guarantee */}
            <div className="alert">
              ⚠ Please check your bike model, year and OEM number before
              ordering. Contact us if unsure.
            </div>

            {/* Cart actions — qty stepper + add to basket (+ buy now) + wishlist */}
            <div className="pdp-actions">
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
              <WishlistButton
                className="h-11 w-11 self-center border-line bg-white"
                product={{
                  productId: p.id,
                  name: p.name,
                  slug: p.slug,
                  price: Number(p.price),
                  image: p.images[0],
                  brand: p.brand.name,
                }}
              />
            </div>

            {/* Fitments */}
            {p.compatibilities.length > 0 && (
              <section id="fitment">
                <h3 style={{ margin: "24px 0 10px", fontSize: 15 }}>
                  Fits these bikes{" "}
                  <span
                    className="muted"
                    style={{ fontSize: 12, fontWeight: 500 }}
                  >
                    · {p.compatibilities.length} fitment
                    {p.compatibilities.length === 1 ? "" : "s"}
                  </span>
                </h3>
                <div className="fitlist">
                  <div className="row h">
                    <div>Make</div>
                    <div>Model</div>
                    <div>Years</div>
                  </div>
                  {p.compatibilities.map((c) => (
                    <div className="row" key={c.id}>
                      <div style={{ fontWeight: 700 }}>
                        {c.bikeModel.brand.name}
                      </div>
                      <div>{c.bikeModel.name}</div>
                      <div className="muted tabular-nums">
                        {c.yearFrom === c.yearTo
                          ? c.yearFrom
                          : `${c.yearFrom}–${c.yearTo}`}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Tabs — CSS-only anchors (server component: sections are stacked
            below, no client tab state). */}
        <div className="tabs">
          <a className="on" href="#description">Description</a>
          {p.compatibilities.length > 0 && <a href="#fitment">Fitment</a>}
          <a href="#delivery">Delivery &amp; returns</a>
        </div>

        <div
          id="description"
          style={{ padding: "18px 0", maxWidth: 780, color: "#333", fontSize: 15 }}
        >
          <p style={{ margin: 0, lineHeight: 1.7 }}>{p.description}</p>
        </div>

        <div className="hr" style={{ maxWidth: 780 }} />

        {/* Delivery / trust strip */}
        <div id="delivery" className="grid g-3" style={{ maxWidth: 780 }}>
          <TrustItem icon={Truck} label="Free shipping over £200" />
          <TrustItem icon={RotateCcw} label="30-day returns" />
          <TrustItem icon={ShieldCheck} label="Genuine parts" />
        </div>
      </div>
    </div>
  );
}

function TrustItem({
  icon: Icon, label,
}: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center rounded-lg border border-line bg-soft px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-red" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
