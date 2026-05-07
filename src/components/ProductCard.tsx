import Link from "next/link";
import { fmtMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { AddToCartIconButton } from "@/components/AddToCartIconButton";
import { WishlistButton } from "@/components/WishlistButton";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  price: number | string;
  stock: number;
  images: string[];
  brand: { name: string };
  category: { name: string };
  oemNumber?: string | null;
  sku?: string | null;
  fitments?: { brand: string; model: string; yearFrom: number; yearTo: number }[];
  /** Set by the server when the viewer is a trade-approved user. */
  tradePrice?: { discounted: number; percent: number };
};

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%231C1E21'/></svg>`,
  );

function fmtFitment(f: { brand: string; model: string; yearFrom: number; yearTo: number }) {
  const years = f.yearFrom === f.yearTo ? `${f.yearFrom}` : `${f.yearFrom}–${f.yearTo}`;
  return `${f.brand} ${f.model} (${years})`;
}

export function ProductCard({ p }: { p: ProductCardData }) {
  const img = p.images[0] ?? PLACEHOLDER;
  const fitmentLabel = p.fitments && p.fitments.length > 0
    ? p.fitments.slice(0, 2).map(fmtFitment).join(" · ") +
      (p.fitments.length > 2 ? ` +${p.fitments.length - 2}` : "")
    : null;

  return (
    <Link
      href={`/products/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6),0_0_0_1px_rgba(232,21,27,0.12)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={p.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
          {p.stock <= 0 && (
            <Badge variant="destructive" className="text-[10px]">Sold out</Badge>
          )}
          <WishlistButton
            size="sm"
            product={{
              productId: p.id,
              name: p.name,
              slug: p.slug,
              price: typeof p.price === "string" ? Number(p.price) : p.price,
              image: p.images[0],
              brand: p.brand.name,
            }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="default" className="text-[11px]">{p.brand.name}</Badge>
          <Badge variant="secondary" className="text-[11px]">{p.category.name}</Badge>
        </div>

        <h3 className="line-clamp-2 min-h-[2.5rem] text-base font-semibold leading-tight text-foreground sm:text-[17px]">
          {p.name}
        </h3>

        {fitmentLabel && (
          <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">
            <span className="font-mono uppercase tracking-wider opacity-60">Fits:</span>{" "}
            {fitmentLabel}
          </p>
        )}

        {(p.oemNumber || p.sku) && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground">
            {p.oemNumber && (
              <span className="font-mono">
                <span className="opacity-60">OEM</span> {p.oemNumber}
              </span>
            )}
            {p.sku && (
              <span className="font-mono">
                <span className="opacity-60">SKU</span> {p.sku}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto space-y-2 pt-2">
          <div className="flex items-end justify-between gap-2">
            <div className="flex flex-col">
              {p.tradePrice && p.tradePrice.percent > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold tabular-nums tracking-tight text-emerald-400">
                      {fmtMoney(p.tradePrice.discounted)}
                    </span>
                    <Badge className="bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/15">
                      Trade −{p.tradePrice.percent}%
                    </Badge>
                  </div>
                  <span className="text-[12px] text-muted-foreground line-through">
                    {fmtMoney(p.price)}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                  {fmtMoney(p.price)}
                </span>
              )}
            </div>
            <span className={`text-[13px] font-medium ${p.stock > 0 ? "text-emerald-400" : "text-destructive"}`}>
              {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
            </span>
          </div>
          <AddToCartIconButton
            product={{
              productId: p.id,
              slug: p.slug,
              name: p.name,
              price:
                p.tradePrice && p.tradePrice.percent > 0
                  ? p.tradePrice.discounted
                  : typeof p.price === "string"
                    ? Number(p.price)
                    : p.price,
              image: p.images[0],
              stock: p.stock,
            }}
          />
        </div>
      </div>
    </Link>
  );
}
