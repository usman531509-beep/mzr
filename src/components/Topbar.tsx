import { getActiveOffers } from "@/lib/offers-cache";

// Async server component. Renders the storefront promotional bar — but only
// if at least one Offer is active in the database. Returning null hides the
// bar entirely (no markup), so admins can turn it off site-wide simply by
// deactivating every offer in /admin/offers.
export async function Topbar() {
  const offers = await getActiveOffers();
  if (offers.length === 0) return null;

  // First offer doubles as the mobile message — keeps the bar uncluttered on
  // small screens; everything is shown on md+.
  const mobileOffer = offers[0];

  return (
    <div className="relative h-9 overflow-hidden bg-gradient-to-r from-red-600 via-red to-red-600">
      <div className="pointer-events-none absolute inset-0 [background:repeating-linear-gradient(90deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_60px)]" />
      <div className="relative mx-auto flex h-full w-full max-w-site items-center justify-between gap-4 px-[var(--gutter)]">
        <div className="hidden md:flex items-center gap-5 font-mono text-[13px] font-semibold tracking-wide text-white/90">
          {offers.map((o) => (
            <span key={o.id}>
              {o.icon ? <span className="mr-1">{o.icon}</span> : null}
              {o.text}
            </span>
          ))}
        </div>
        <div className="md:hidden font-mono text-[12.5px] font-semibold tracking-wide text-white/90">
          {mobileOffer.icon ? <span className="mr-1">{mobileOffer.icon}</span> : null}
          {mobileOffer.text}
        </div>
        <div className="flex items-center gap-4 font-mono text-[12.5px] font-semibold uppercase tracking-wider text-white/85">
          <a href="#" className="hover:text-white transition">Help</a>
        </div>
      </div>
    </div>
  );
}
