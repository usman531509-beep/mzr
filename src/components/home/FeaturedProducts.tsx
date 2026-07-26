import Link from "next/link";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";

export function FeaturedProducts({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section className="h-section alt">
      <div className="h-container">
        <div className="h-sec-head">
          <div>
            <div className="label">Bestsellers This Week</div>
            <h2>Hand-picked by our workshop.</h2>
            <p className="sub">
              Workshop favourites — the parts we recommend most often when
              riders walk in with a problem to solve.
            </p>
          </div>
          <Link href="/products" className="h-link">All products →</Link>
        </div>

        <div className="h-pgrid">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
