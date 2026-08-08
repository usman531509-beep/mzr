import {
  Package, Truck, ShieldCheck, RotateCcw, Lock,
  type LucideIcon,
} from "lucide-react";

// Trust + stats strip directly under the hero. Merges the old hero stat
// counters (1000s / 24H / 100%) with the "safe to buy" cues into a single
// five-up band: each item pairs a headline figure with a supporting label.

type TrustItem = { Icon: LucideIcon; stat: string; label: string };

const ITEMS: TrustItem[] = [
  { Icon: Package,     stat: "1000s",  label: "Parts in stock" },
  { Icon: Truck,       stat: "24H",    label: "Same-day dispatch" },
  { Icon: ShieldCheck, stat: "100%",   label: "Fitment guarantee" },
  { Icon: RotateCcw,   stat: "30-Day", label: "No-quibble returns" },
  { Icon: Lock,        stat: "Secure", label: "Stripe · 256-bit TLS" },
];

export function TrustStrip() {
  return (
    <section className="h-trust">
      <div className="h-trust-in">
        {ITEMS.map(({ Icon, stat, label }) => (
          <div key={label} className="h-trust-item">
            <span className="h-trust-ico">
              <Icon className="h-5 w-5" />
            </span>
            <div className="h-trust-text">
              <b>{stat}</b>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
