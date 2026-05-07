import Link from "next/link";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";

export function FeaturedProducts({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-site px-[var(--gutter)] py-16">
      <div className="mb-9 flex items-end justify-between gap-5">
        <div>
          <div className="eyebrow mb-2">Hand-picked</div>
          <h2 className="section-h2">Featured <em>parts</em></h2>
        </div>
        <Link
          href="/products"
          className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap border-b border-red/40 pb-0.5 font-head text-[13px] font-bold uppercase tracking-wider text-red transition hover:opacity-70"
        >
          See all →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
