import Link from "next/link";
import Image from "next/image";
import type { NavCategoryNode } from "@/lib/nav-cache";

export function Footer({ tree = [] }: { tree?: NavCategoryNode[] }) {
  // Pick the six top-level categories with the most active products. Keeps
  // the column compact while staying in sync with the actual catalogue.
  const shopLinks = tree
    .filter((c) => c.productCount > 0)
    .slice(0, 6)
    .map((c) => ({ l: c.name, h: `/products?category=${c.path}` }));
  return (
    <footer className="border-t border-white/10 bg-[#040405] px-[var(--gutter)] py-16">
      <div className="mx-auto max-w-site">
        <div className="mb-12 grid gap-12 md:grid-cols-2 lg:grid-cols-[2.2fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center" aria-label="MZR Spare — home">
              <Image
                src="/logo.png"
                alt="MZR Spare — Motorbike Parts Specialist"
                width={617}
                height={405}
                className="h-14 w-auto"
              />
            </Link>
            <p className="mt-4 max-w-[310px] text-[13px] font-light leading-relaxed text-white/40">
              Genuine and aftermarket spares for every popular bike. Filter by your model and year only see what fits.
            </p>
            <address className="mt-5 not-italic text-[12.5px] leading-loose text-white/40">
              <strong className="text-[13px] font-semibold text-white/85">Customer support</strong><br />
              <a href="mailto:hello@mzrparts.com" className="transition hover:text-white">hello@mzrparts.com</a><br />
              Mon–Fri 9–6 · Sat 9–5
            </address>
          </div>

          <FCol
            title="Shop"
            links={shopLinks.length > 0
              ? shopLinks
              : [{ l: "All parts", h: "/products" }]}
          />

          <FCol title="Account" links={[
            { l: "Sign in", h: "/login" },
            { l: "Create account", h: "/register" },
            { l: "My orders", h: "/account/orders" },
            { l: "Track order", h: "/track" },
            { l: "Cart", h: "/cart" },
          ]} />

          <FCol title="Help" links={[
            { l: "Shipping & returns", h: "#" },
            { l: "Fitment guarantee", h: "#" },
            { l: "Trade accounts", h: "#" },
            { l: "Contact us", h: "#" },
          ]} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
          <p className="text-[11.5px] text-white/40">
            © {new Date().getFullYear()} MZR Parts. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="#" className="text-[11.5px] text-white/40 transition hover:text-white/85">Privacy</a>
            <a href="#" className="text-[11.5px] text-white/40 transition hover:text-white/85">Terms</a>
            <a href="#" className="text-[11.5px] text-white/40 transition hover:text-white/85">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FCol({ title, links }: { title: string; links: { l: string; h: string }[] }) {
  return (
    <div>
      <h5 className="mb-4 border-b border-red/25 pb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-red">
        {title}
      </h5>
      <ul>
        {links.map((it) => (
          <li key={it.l}>
            <Link
              href={it.h}
              className="block py-1 text-[12.5px] text-white/40 transition hover:translate-x-1 hover:text-white"
            >
              {it.l}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
