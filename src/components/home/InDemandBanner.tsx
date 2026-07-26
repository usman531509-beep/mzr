import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { fmtMoney } from "@/lib/format";

export type InDemandProduct = {
  id: string;
  slug: string;
  name: string;
  price: string;
  image: string | null;
  brand: string;
  stockCopy: string;
};

// Data-driven banner. Renders products the admin has marked `demanding`
// as 1-3 cards. Two layouts: on mobile the image fills the card and the
// text overlays it with a light gradient at the bottom (best use of the
// narrow viewport); on md+ the image bleeds to the right and the text
// sits beside it. Hides itself when nothing is tagged.

export function InDemandBanner({ products }: { products: InDemandProduct[] }) {
  if (products.length === 0) return null;

  const gridCols =
    products.length === 1 ? "md:grid-cols-1"
    : products.length === 2 ? "md:grid-cols-2"
    : "md:grid-cols-3";

  // Desktop card heights. On mobile, every card uses the same square-ish
  // aspect ratio so the image reads as a hero.
  const desktopCardHeight =
    products.length === 1 ? "md:h-[420px] lg:h-[460px]"
    : products.length === 2 ? "md:h-80 lg:h-[360px]"
    : "md:h-44";

  const gridWrap = products.length === 1 ? "mx-auto max-w-3xl" : "";

  const desktopImageWidth =
    products.length === 1 ? "md:w-[50%]"
    : products.length === 2 ? "md:w-[52%]"
    : "md:w-[55%]";

  return (
    <section className="h-section">
      <div className="h-container">
        <div className="h-sec-head">
          <div>
            <div className="label">In Demand Right Now</div>
            <h2>Hot picks.</h2>
            <p className="sub">
              Parts riders keep coming back for — limited stock, fast movers.
            </p>
          </div>
          <Link href="/products" className="h-link">See all parts →</Link>
        </div>

        <div className={`grid gap-4 ${gridCols} ${gridWrap}`}>
          {products.slice(0, 3).map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-1 hover:border-red hover:shadow-[0_24px_50px_-20px_rgba(227,6,19,0.25)]"
            >
              {/* Thin red accent line at the top so the "in demand" tone is
                  still hinted without tinting the product image. */}
              <span className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-[3px] bg-gradient-to-r from-red-400 via-red to-red-700" />

              {/* MOBILE: image fills the card; copy overlays the bottom with a
                  light gradient backdrop so the photo is fully visible.
                  DESKTOP (md+): the absolute container shrinks back to the right
                  ~half of the card and the text block sits beside it. */}
              <div className={`relative h-[420px] sm:h-[440px] ${desktopCardHeight}`}>
                {p.image ? (
                  <div
                    className={`absolute inset-0 overflow-hidden md:inset-y-0 md:left-auto md:right-0 ${desktopImageWidth}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    {/* Light fade on mobile sits at the bottom to make the
                        overlay text readable; on md+ it moves to the left edge
                        so the image blends back into the card body. */}
                    <span
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-white/75 to-transparent md:bg-gradient-to-r md:from-white md:via-white/70 md:to-transparent"
                    />
                  </div>
                ) : (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 text-7xl opacity-15"
                  >
                    🛠️
                  </span>
                )}

                {/* Text block.
                    MOBILE: anchored to the bottom-left, full width, overlays
                    the image with a light gradient behind it.
                    DESKTOP: vertically centred in the left half of the card. */}
                <div className="absolute inset-x-0 bottom-0 z-10 p-5 md:relative md:inset-auto md:flex md:h-full md:max-w-[60%] md:flex-col md:justify-center md:p-6">
                  <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-red/30 bg-red-soft px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-red">
                    <Flame className="h-3 w-3" /> In demand
                  </div>
                  <div className="font-head text-2xl uppercase leading-tight text-ink line-clamp-2 md:text-2xl">
                    {p.name}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {p.brand} · {p.stockCopy}
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-head text-3xl text-ink tabular-nums">
                      {fmtMoney(Number(p.price))}
                    </span>
                  </div>
                  <div className="mt-4 inline-flex w-fit items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wider text-red transition group-hover:gap-2.5">
                    Shop now <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
