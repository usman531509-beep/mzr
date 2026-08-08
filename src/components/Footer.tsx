import Link from "next/link";
import Image from "next/image";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import {
  SITE_PHONE, SITE_PHONE_TEL, SITE_EMAIL, SITE_SUPPORT_EMAIL,
  SITE_ADDRESS, SITE_HOURS,
} from "@/lib/site";
import type { NavCategoryNode } from "@/lib/nav-cache";

// Compact storefront footer: brand + contact column and Shop / Account / Help
// link columns over a dark red-black panel. Shop links follow the live tree.
export function Footer({ tree = [] }: { tree?: NavCategoryNode[] }) {
  const shopLinks = tree
    .filter((c) => c.productCount > 0)
    .slice(0, 5)
    .map((c) => ({ l: c.name, h: `/products?category=${c.path}` }));

  const year = new Date().getFullYear();

  return (
    <footer className="h-footer">
      <div className="h-container">
        <div className="h-footer-grid">
          {/* Brand + contact */}
          <div className="h-footer-brand">
            <Link href="/" className="h-logo" aria-label="MZR Spare — home">
              <Image
                src="/logo.png"
                alt="MZR Spare — Motorbike Parts Specialist"
                width={617}
                height={405}
                className="h-12 w-auto"
              />
            </Link>
            <p className="h-footer-desc">
              Genuine and aftermarket spares for scooters, mopeds and
              motorcycles — parts that fit, first time.
            </p>

            <ul className="h-footer-contact">
              <li>
                <Phone />
                <a href={`tel:${SITE_PHONE_TEL}`}>{SITE_PHONE}</a>
              </li>
              <li>
                <Mail />
                <a href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a>
                <span className="sep">·</span>
                <a href={`mailto:${SITE_SUPPORT_EMAIL}`}>{SITE_SUPPORT_EMAIL}</a>
              </li>
              <li>
                <Clock />
                <span>{SITE_HOURS}</span>
              </li>
              <li>
                <MapPin />
                <span>{SITE_ADDRESS}</span>
              </li>
            </ul>

            <div className="h-footer-social">
              <a href="#" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
                </svg>
              </a>
              <a href="#" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a href="#" aria-label="YouTube">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.77-1.77C19.34 5.13 12 5.13 12 5.13s-7.34 0-8.83.4A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.77 1.77c1.49.4 8.83.4 8.83.4s7.34 0 8.83-.4a2.5 2.5 0 0 0 1.77-1.77C23 15.2 23 12 23 12zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="h-footer-col">
            <h5>Shop</h5>
            {shopLinks.length > 0 ? (
              shopLinks.map((it) => <Link key={it.l} href={it.h}>{it.l}</Link>)
            ) : (
              <Link href="/products">All parts</Link>
            )}
            <Link href="/products">All products</Link>
          </div>

          <div className="h-footer-col">
            <h5>Account</h5>
            <Link href="/login">Sign in</Link>
            <Link href="/account/orders">My orders</Link>
            <Link href="/track">Track order</Link>
            <Link href="/cart">Basket</Link>
            <Link href="/trade-account">Trade account</Link>
          </div>

          <div className="h-footer-col">
            <h5>Help</h5>
            <a href="#">Shipping &amp; returns</a>
            <a href="#">Fitment guarantee</a>
            <a href={`mailto:${SITE_SUPPORT_EMAIL}`}>Contact us</a>
            <a href="#">Privacy policy</a>
            <a href="#">Terms &amp; conditions</a>
          </div>
        </div>

        <div className="h-foot-bottom">
          <div>© {year} MZR Spare Ltd · All rights reserved.</div>
          <nav className="h-foot-legal" aria-label="Legal">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Cookies</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
