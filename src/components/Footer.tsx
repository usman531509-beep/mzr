import Link from "next/link";
import Image from "next/image";
import type { NavCategoryNode } from "@/lib/nav-cache";

// Storefront footer — reference design (.h-footer): dark red-black panel,
// brand + contact column, Shop / Account / Help link columns and a payment
// strip. Shop links stay wired to the live category tree.
export function Footer({ tree = [] }: { tree?: NavCategoryNode[] }) {
  // Pick the top-level categories with the most active products. Keeps the
  // column compact while staying in sync with the actual catalogue.
  const shopLinks = tree
    .filter((c) => c.productCount > 0)
    .slice(0, 7)
    .map((c) => ({ l: c.name, h: `/products?category=${c.path}` }));

  return (
    <footer className="h-footer">
      <div className="h-container">
        <div className="h-footer-grid">
          <div>
            <Link href="/" className="h-logo" aria-label="MZR Spare — home">
              <Image
                src="/logo.png"
                alt="MZR Spare — Motorbike Parts Specialist"
                width={617}
                height={405}
                className="h-12 w-auto"
              />
            </Link>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#8f95a6", margin: "20px 0", maxWidth: 380 }}>
              Genuine and aftermarket spares for scooters, mopeds and motorcycles.
              Filter by model and year to find parts that fit — first time, every time.
            </p>
            <p style={{ fontSize: 14, color: "#8f95a6", lineHeight: 1.8 }}>
              ✉ <a href="mailto:hello@mzrparts.com" style={{ display: "inline", padding: 0 }}>hello@mzrparts.com</a>
              <br />
              Mon–Fri 9–6 · Sat 9–5
            </p>
          </div>

          <div>
            <h5>Shop</h5>
            {shopLinks.length > 0 ? (
              shopLinks.map((it) => (
                <Link key={it.l} href={it.h}>{it.l}</Link>
              ))
            ) : (
              <Link href="/products">All parts</Link>
            )}
          </div>

          <div>
            <h5>Account</h5>
            <Link href="/login">Sign in</Link>
            <Link href="/register">Create account</Link>
            <Link href="/account/orders">My orders</Link>
            <Link href="/track">Track order</Link>
            <Link href="/cart">Basket</Link>
            <Link href="/trade-account">Trade account</Link>
          </div>

          <div>
            <h5>Help</h5>
            <a href="#">Shipping &amp; returns</a>
            <a href="#">Fitment guarantee</a>
            <Link href="/trade-account">Trade accounts</Link>
            <a href="#">Contact us</a>
            <a href="#">Privacy policy</a>
            <a href="#">Terms</a>
          </div>
        </div>

        <div className="h-foot-bottom">
          <div>© {new Date().getFullYear()} MZR Spare Ltd · Built for serious mechanics 🛠️</div>
          <div className="h-pay">
            <span>VISA</span><span>MC</span><span>AMEX</span><span>PAYPAL</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
