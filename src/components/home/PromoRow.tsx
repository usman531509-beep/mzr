import Link from "next/link";

export function PromoRow() {
  return (
    <section className="mx-auto max-w-site px-[var(--gutter)] pb-16">
      <div className="grid gap-3.5 md:grid-cols-3">
        <PromoCard
          tone="red"
          tag="🔥 Flash sale"
          title="Up to 40% off body kits"
          href="/products?category=body"
          emoji="🏍️"
        />
        <PromoCard
          tone="gold"
          tag="📦 Free delivery"
          title="On orders over £200"
          href="/products"
          emoji="🚚"
        />
        <PromoCard
          tone="green"
          tag="✓ Genuine parts"
          title="OEM-grade guarantee"
          href="/products"
          emoji="🛡️"
        />
      </div>
    </section>
  );
}

function PromoCard({
  tone, tag, title, href, emoji,
}: {
  tone: "red" | "gold" | "green";
  tag: string; title: string; href: string; emoji: string;
}) {
  const styles = {
    red: { bg: "bg-[linear-gradient(135deg,rgba(232,21,27,0.25),rgba(232,21,27,0.05))]", border: "border-red/20", lbl: "text-red" },
    gold: { bg: "bg-[linear-gradient(135deg,rgba(245,166,35,0.15),rgba(245,166,35,0.03))]", border: "border-gold/25", lbl: "text-gold" },
    green: { bg: "bg-[linear-gradient(135deg,rgba(34,197,94,0.12),rgba(34,197,94,0.03))]", border: "border-ok/15", lbl: "text-ok" },
  }[tone];
  return (
    <Link
      href={href}
      className={`relative flex h-40 items-end overflow-hidden rounded-lg border ${styles.border} ${styles.bg} transition hover:-translate-y-1`}
    >
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-7xl opacity-25">{emoji}</span>
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-ink/90 to-transparent" />
      <div className="relative z-10 p-5">
        <div className={`mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${styles.lbl}`}>
          {tag}
        </div>
        <div className="mb-2 font-head text-xl font-extrabold uppercase leading-tight text-white">{title}</div>
        <div className={`flex items-center gap-1.5 font-head text-[11px] font-bold uppercase tracking-wider ${styles.lbl}`}>
          Shop now →
        </div>
      </div>
    </Link>
  );
}
