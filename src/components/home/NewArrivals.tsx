import Link from "next/link";
import { Flame, Sparkles } from "lucide-react";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";

// Latest-additions strip. Renders a horizontally scrollable rail on mobile
// (snap points so each card lines up cleanly) and a static grid from `lg`
// upwards. Pairs with the "Featured" section but pulls fresh stock instead
// of admin-curated picks.

export function NewArrivals({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-site px-[var(--gutter)] py-16">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="eyebrow mb-2 inline-flex items-center gap-1.5">
            <Flame className="h-3 w-3" /> Just landed
          </div>
          <h2 className="section-h2">
            New <em>in stock</em>
          </h2>
          <p className="mt-1 max-w-md text-[13px] text-white/55">
            The latest parts and accessories added to the catalogue.
          </p>
        </div>
        <Link
          href="/products?sort=new"
          className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap border-b border-red/40 pb-0.5 font-head text-[13px] font-bold uppercase tracking-wider text-red transition hover:opacity-70"
        >
          Browse newest →
        </Link>
      </div>

      {/* Mobile: snap scroller. Desktop: regular grid. */}
      <div className="-mx-[var(--gutter)] flex snap-x snap-mandatory gap-3 overflow-x-auto px-[var(--gutter)] pb-3 sm:gap-4 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0 xl:grid-cols-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="w-[68%] shrink-0 snap-start sm:w-[42%] md:w-[32%] lg:w-auto"
          >
            <ProductCard p={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
