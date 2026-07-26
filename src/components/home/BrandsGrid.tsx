import Link from "next/link";

export type BrandTile = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  productCount: number;
};

// Visual "shop by bike" tile row. Up to ~10 of the bike brands with the most
// stocked parts, each rendered as a reference-style .h-tile with the brand
// logo (falling back to the brand initial when no logoUrl is uploaded).

export function BrandsGrid({ brands }: { brands: BrandTile[] }) {
  if (brands.length === 0) return null;
  return (
    <section className="h-section alt">
      <div className="h-container">
        <div className="h-sec-head">
          <div>
            <div className="label">Shop By Bike</div>
            <h2>Your bike. Your parts.</h2>
            <p className="sub">
              Pick a manufacturer to filter the catalogue to verified fitments.
            </p>
          </div>
          <Link href="/products" className="h-link">All bike brands →</Link>
        </div>

        <div className="h-tiles">
          {brands.map((b) => (
            <Link key={b.id} href={`/products?brand=${b.slug}`} className="h-tile">
              <div className="h-tile-img">
                {b.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.logoUrl} alt={b.name} />
                ) : (
                  <span className="font-head text-3xl text-red">
                    {b.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="h-tile-name">{b.name}</div>
              <div className="h-tile-sub">
                {b.productCount > 0
                  ? `${b.productCount} part${b.productCount === 1 ? "" : "s"}`
                  : "Coming soon"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
