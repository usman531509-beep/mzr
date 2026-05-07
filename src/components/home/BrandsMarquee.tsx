import Link from "next/link";

export function BrandsMarquee({ brands }: { brands: { name: string; slug: string }[] }) {
  if (brands.length === 0) return null;
  return (
    <section id="brands" className="border-y border-white/10 bg-ink py-10">
      <div className="mb-6 text-center font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
        Trusted by riders · 30+ brands in stock
      </div>
      <div className="marquee mx-auto max-w-site px-[var(--gutter)]">
        {brands.map((b) => (
          <Link key={b.slug} href={`/products?brand=${b.slug}`} className="pill-brand">
            {b.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
