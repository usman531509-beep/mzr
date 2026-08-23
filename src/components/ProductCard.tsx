import Link from "next/link";
import { fmtMoney } from "@/lib/format";
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
  // Nullable for orphaned products whose category was soft-deleted. The
  // card falls back to "Uncategorised" instead of hiding the row outright.
  category: { name: string } | null;
  oemNumber?: string | null;
  sku?: string | null;
  fitments?: { brand: string; model: string; yearFrom: number; yearTo: number }[];
  /** Set by the server when the viewer is a trade-approved user. */
  tradePrice?: { discounted: number; percent: number };
};

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%23f5f6f9'/></svg>`,
  );

function fmtFitment(f: { brand: string; model: string; yearFrom: number; yearTo: number }) {
  const years = f.yearFrom === f.yearTo ? `${f.yearFrom}` : `${f.yearFrom}–${f.yearTo}`;
  return `${f.brand} ${f.model} (${years})`;
}

// One detail line: a fixed-width uppercase label (OEM / SKU / Fits) with the
// value beside it, so the three details stack cleanly instead of running into
// one wrapped paragraph.
function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5 leading-snug">
      <span className="w-8 shrink-0 pt-px text-[10px] font-bold uppercase tracking-wide text-ink/45">
        {label}
      </span>
      <span className="min-w-0 flex-1 break-words">{value}</span>
    </div>
  );
}

// Reference product card (.h-pcard): white rounded tile, brand tag over the
// image, red uppercase brand line, Bebas price and a compact red "+ Add"
// button. All commerce logic (wishlist, add-to-cart, trade pricing) is kept.
export function ProductCard({ p }: { p: ProductCardData }) {
  const img = p.images[0] ?? PLACEHOLDER;
  const fitmentLabel = p.fitments && p.fitments.length > 0
    ? p.fitments.slice(0, 2).map(fmtFitment).join(" · ") +
      (p.fitments.length > 2 ? ` +${p.fitments.length - 2}` : "")
    : null;

  const hasTrade = !!(p.tradePrice && p.tradePrice.percent > 0);
  const nowPrice = hasTrade ? p.tradePrice!.discounted : p.price;

  return (
    <Link href={`/products/${p.slug}`} className="h-pcard">
      <div className="h-pcard-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt={p.name} className="!object-contain bg-white p-2" />
        {(hasTrade || p.stock <= 0) && (
          <div className="h-pcard-tags">
            {hasTrade && <span className="alt">Trade −{p.tradePrice!.percent}%</span>}
            {p.stock <= 0 && <span className="alt">Sold out</span>}
          </div>
        )}
        <WishlistButton
          className="absolute right-3 top-3 z-[2] h-9 w-9 border-0 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.08)]"
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

      <div className="h-pcard-body">
        <div className="h-pcard-brand">
          <span>{p.brand.name}</span>
          {p.category && <span className="h-pcard-cat">{p.category.name}</span>}
        </div>
        <div className="h-pcard-title">{p.name}</div>
        {(p.oemNumber || p.sku || fitmentLabel) && (
          <div className="h-pcard-meta space-y-1">
            {p.oemNumber && <MetaRow label="OEM" value={p.oemNumber} />}
            {p.sku && <MetaRow label="SKU" value={p.sku} />}
            {fitmentLabel && <MetaRow label="Fits" value={fitmentLabel} />}
          </div>
        )}

        {p.stock > 0 ? (
          <div className={`h-stock${p.stock <= 5 ? " low" : ""}`}>
            {p.stock <= 5 ? `Only ${p.stock} left` : `In stock · ${p.stock} left`}
          </div>
        ) : (
          <div className="h-stock" style={{ color: "#c0392b" }}>Out of stock</div>
        )}

        <div className="h-pcard-foot">
          <div className="h-price">
            {hasTrade && <span className="h-old">{fmtMoney(p.price)}</span>}
            <span className="h-now">{fmtMoney(nowPrice)}</span>
          </div>
          <AddToCartIconButton
            product={{
              productId: p.id,
              slug: p.slug,
              name: p.name,
              price:
                hasTrade
                  ? p.tradePrice!.discounted
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
