import Link from "next/link";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";

// Latest-additions strip. Pairs with the "Bestsellers" section but pulls
// fresh stock instead of admin-curated picks.

export function NewArrivals({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section className="h-section">
      <div className="h-container">
        <div className="h-sec-head">
          <div>
            <div className="label">Just Landed</div>
            <h2>New in stock.</h2>
            <p className="sub">
              The latest parts and accessories added to the catalogue.
            </p>
          </div>
          <Link href="/products?sort=new" className="h-link">Browse newest →</Link>
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
