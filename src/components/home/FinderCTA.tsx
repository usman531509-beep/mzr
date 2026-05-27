import Link from "next/link";
import { Bike, ArrowRight } from "lucide-react";

// Mid-page reminder that the storefront filters by bike fitment. The Hero
// finder is the primary affordance; this is a follow-up callout further down
// the page for customers who scrolled past it.

export function FinderCTA() {
  return (
    <section className="mx-auto max-w-site px-[var(--gutter)] py-16">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(232,21,27,0.18),rgba(232,21,27,0.02)_55%,transparent)] px-6 py-10 sm:px-10 sm:py-14">
        {/* Decorative bike silhouette */}
        <Bike
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-72 w-72 stroke-[0.4] text-red/15"
        />
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(232,21,27,0.18),transparent_60%)]" />

        <div className="relative max-w-xl">
          <div className="eyebrow mb-3">Find what fits</div>
          <h2 className="font-head text-3xl font-extrabold uppercase leading-tight text-white sm:text-4xl">
            Only see <em className="not-italic text-red">parts that fit</em> your bike
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65 sm:text-[15px]">
            Pick your brand, model and year — we filter the catalogue down to
            exactly what bolts on. No more checking 8 PDFs to confirm a part
            number.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-md bg-red px-5 py-2.5 font-head text-[13px] font-bold uppercase tracking-wider text-white transition hover:bg-red-dark"
            >
              Browse all parts <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/#hero-finder"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 px-5 py-2.5 font-head text-[13px] font-bold uppercase tracking-wider text-white/85 transition hover:border-red/40 hover:text-white"
            >
              Open finder
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
