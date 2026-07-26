import {
  ShieldCheck, Truck, RotateCcw, Lock, Headset,
  type LucideIcon,
} from "lucide-react";

// Light trust strip in the reference's .h-brandstrip slot — a bordered white
// band directly under the hero surfacing the "safe to buy" cues.

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
    <section className="h-brandstrip">
      <div className="h-brandstrip-in">
        <span className="label">Why MZR</span>
        {ITEMS.map(({ Icon, t, s }) => (
          <div key={t} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-soft text-red">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="font-head text-[15px] uppercase tracking-wide text-ink">
                {t}
              </div>
              <div className="whitespace-nowrap text-[11px] text-muted-foreground">{s}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
