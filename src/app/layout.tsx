import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, Rajdhani } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { getNavData } from "@/lib/nav-cache";
import { Topbar } from "@/components/Topbar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GlobalOverlays } from "@/components/GlobalOverlays";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { CartScope } from "@/components/CartScope";
import { WishlistScope } from "@/components/WishlistScope";
import { ForcePasswordChange } from "@/components/ForcePasswordChange";

const body = Barlow({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});
const head = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-head",
  display: "swap",
});
const monoUi = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-mono-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "MZR Parts — Motorbike Spares & Accessories", template: "%s · MZR Parts" },
  description:
    "Genuine and aftermarket motorbike spare parts. Filter by your bike model and year — only see what fits.",
  keywords: ["motorbike parts", "spare parts", "motorcycle", "bike accessories"],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [session, nav] = await Promise.all([auth(), getNavData()]);
  const { brands, models, categories } = nav;
  const navCategories = categories.map((c) => ({
    name: c.name, slug: c.slug, count: c.productCount,
  }));
  const navBrands = brands.map((b) => ({ name: b.name, slug: b.slug }));

  return (
    <html lang="en" className={`${body.variable} ${head.variable} ${monoUi.variable}`}>
      <body className="min-h-screen flex flex-col pb-[64px] lg:pb-0">
        <SessionProvider session={session}>
          <CartScope />
          <WishlistScope />
          <ForcePasswordChange />
          {/* Topbar is a server component so it can fetch active offers and
              hide itself site-wide when none are active. */}
          <Topbar />
          <Header categories={navCategories} brands={navBrands} />
          <main className="flex-1">{children}</main>
          <Footer />
          <GlobalOverlays brands={brands} models={models} categories={navCategories} />
          <MobileBottomBar />
        </SessionProvider>
      </body>
    </html>
  );
}
