import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import "./theme.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { getNavData } from "@/lib/nav-cache";
import { Topbar } from "@/components/Topbar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GlobalOverlays } from "@/components/GlobalOverlays";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { SiteChrome } from "@/components/SiteChrome";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CartScope } from "@/components/CartScope";
import { WishlistScope } from "@/components/WishlistScope";
import { ForcePasswordChange } from "@/components/ForcePasswordChange";

// Reference design fonts: Inter for body/UI text, Bebas Neue for the big
// condensed display headings. --font-mono-ui also maps to Inter (the
// reference has no separate mono face; tables rely on tabular-nums).
const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-body",
  display: "swap",
});
const head = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-head",
  display: "swap",
});
const monoUi = Inter({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-mono-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "MZR Parts — Motorbike Spares & Accessories", template: "%s · MZR Parts" },
  description:
    "Genuine and aftermarket motorbike spare parts. Filter by your bike model and year only see what fits.",
  keywords: ["motorbike parts", "spare parts", "motorcycle", "bike accessories"],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [session, nav] = await Promise.all([auth(), getNavData()]);
  const { brands, productBrands, models, tree } = nav;
  const navBrands = brands.map((b: { id: string; name: string; slug: string }) => ({ id: b.id, name: b.name, slug: b.slug }));
  const navProductBrands = productBrands.map((b: { name: string; slug: string }) => ({ name: b.name, slug: b.slug }));
  const navModels = models.map((m: { id: string; name: string; brandId: string }) => ({ id: m.id, name: m.name, brandId: m.brandId }));

  return (
    <html lang="en" className={`${body.variable} ${head.variable} ${monoUi.variable}`}>
      <body className="min-h-screen flex flex-col pb-[64px] lg:pb-0">
        <SessionProvider session={session}>
          <CartScope />
          <WishlistScope />
          <ForcePasswordChange />
          {/* Promise-based replacement for window.confirm() — shared by every
              delete button across the app. */}
          <ConfirmDialog />
          {/* Storefront chrome — hidden on /pay/<token> via SiteChrome. */}
          <SiteChrome>
            <Topbar />
            <Header tree={tree} brands={navBrands} productBrands={navProductBrands} models={navModels} />
          </SiteChrome>
          <main className="flex-1">{children}</main>
          <SiteChrome hideOnPortals>
            <Footer tree={tree} />
          </SiteChrome>
          <SiteChrome>
            <GlobalOverlays brands={brands} productBrands={productBrands} models={models} tree={tree} />
            <MobileBottomBar />
          </SiteChrome>
        </SessionProvider>
      </body>
    </html>
  );
}
