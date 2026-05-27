import {
  ShieldCheck, Truck, RotateCcw, Lock, Headset,
  type LucideIcon,
} from "lucide-react";

// Continuously scrolling trust-strip marquee. The track holds two copies of
// the items side by side; CSS animates the whole track from 0 → -50% on a
// linear loop, so the second copy lands exactly where the first started
// for a seamless wrap. Pauses on hover via the .trust-marquee parent.
// Falls back to a static row when prefers-reduced-motion is on.

type TrustItem = { Icon: LucideIcon; t: string; s: string };

const ITEMS: TrustItem[] = [
  { Icon: Truck,       t: "Same-day dispatch", s: "Order before 3pm UK time" },
  { Icon: RotateCcw,   t: "30-day returns",    s: "No-quibble refunds" },
  { Icon: ShieldCheck, t: "Genuine parts",     s: "OEM + verified aftermarket" },
  { Icon: Lock,        t: "Secure checkout",   s: "Powered by Stripe · 256-bit TLS" },
  { Icon: Headset,     t: "Real support",      s: "Mon–Fri 9–6 · Sat 9–5" },
];

export function TrustStrip() {
  return (
    <section className="trust-marquee relative overflow-hidden border-y border-white/10 bg-ink-900">
      {/* Soft fade-out gradients on the edges so items appear to scroll
          into and out of view rather than being clipped sharply. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ink-900 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ink-900 to-transparent" />

      <div className="trust-marquee-track flex w-max items-stretch py-6">
        {/* Two copies; aria-hidden on the second so screen readers don't
            announce the items twice. */}
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1}
            className="flex shrink-0 items-stretch"
          >
            {ITEMS.map((item) => (
              <TrustCell key={`${copy}-${item.t}`} {...item} />
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}

function TrustCell({ Icon, t, s }: TrustItem) {
  return (
    <li className="flex shrink-0 items-center gap-3 px-8 lg:px-12">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-ink-700 text-red">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="font-head text-[12.5px] font-bold uppercase tracking-wide text-white">
          {t}
        </div>
        <div className="whitespace-nowrap text-[11px] text-white/50">{s}</div>
      </div>
    </li>
  );
}
