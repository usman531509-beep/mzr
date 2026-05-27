import Link from "next/link";

export type BrandTile = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  productCount: number;
};

// Visual "shop by brand" grid. Up to ~10 of the brands with the most stock,
// each rendered as a clickable card with their logo (falling back to the
// brand name if no logoUrl is uploaded). Sits above the scrolling marquee —
// the marquee continues to surface the long tail of brands.

export function BrandsGrid({ brands }: { brands: BrandTile[] }) {
  if (brands.length === 0) return null;
  return (
    <section className="mx-auto max-w-site px-[var(--gutter)] py-16">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="eyebrow mb-2">Trusted gear</div>
          <h2 className="section-h2">
            Shop by <em>brand</em>
          </h2>
          <p className="mt-1 max-w-md text-[13px] text-white/55">
            Genuine OEM and aftermarket parts from the names riders trust.
          </p>
        </div>
        <Link
          href="/products"
          className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap border-b border-red/40 pb-0.5 font-head text-[13px] font-bold uppercase tracking-wider text-red transition hover:opacity-70"
        >
          All brands →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {brands.map((b) => (
          <Link
            key={b.id}
            href={`/products?brand=${b.slug}`}
            className="group relative flex aspect-[5/3] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-ink-800 to-ink-900 px-4 transition hover:-translate-y-1 hover:border-red/40 hover:shadow-[0_10px_30px_-12px_rgba(232,21,27,0.4)]"
          >
            {/* Subtle red accent line on hover */}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red/50 to-transparent opacity-0 transition group-hover:opacity-100" />
            {b.logoUrl ? (
              <div className="relative flex h-12 w-full items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.logoUrl}
                  alt={b.name}
                  className="max-h-full max-w-[80%] object-contain opacity-80 transition group-hover:opacity-100"
                />
              </div>
            ) : (
              <div className="font-head text-base font-extrabold uppercase tracking-wide text-white/85">
                {b.name}
              </div>
            )}
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 transition group-hover:text-white/65">
              {b.productCount > 0
                ? `${b.productCount} part${b.productCount === 1 ? "" : "s"}`
                : "Coming soon"}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
