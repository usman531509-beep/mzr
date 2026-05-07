import Link from "next/link";

export type MegaColumn = {
  heading: string;
  items: { label: string; href: string }[];
};

export function MegaMenu({
  columns,
  promo,
  width = "wide",
}: {
  columns: MegaColumn[];
  promo?: {
    tag: string;
    title: string;
    sub: string;
    cta?: { label: string; href: string };
    tone?: "red" | "gold";
  };
  width?: "wide" | "narrow";
}) {
  // Visual width — kept comfortably under viewport edge so it never feels "full width"
  const widthClass = width === "wide" ? "w-[920px]" : "w-[720px]";

  return (
    <div
      className={`mega absolute left-0 top-full z-40 mt-2 ${widthClass} max-w-[calc(100vw-2rem)] origin-top
                  overflow-hidden rounded-xl border border-white/10 bg-ink-800
                  shadow-[0_24px_60px_-10px_rgba(0,0,0,0.7),0_0_0_1px_rgba(232,21,27,0.15)]`}
    >
      {/* top accent bar */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-red to-transparent" />
      {/* faint inner glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(232,21,27,0.08),transparent_55%)]" />

      <div
        className="relative grid gap-0 p-6"
        style={{
          gridTemplateColumns: promo
            ? `repeat(${columns.length},minmax(0,1fr)) 200px`
            : `repeat(${columns.length},minmax(0,1fr))`,
        }}
      >
        {columns.map((col, i) => (
          <div key={i} className={i > 0 ? "border-l border-white/10 pl-5 pr-3" : "pr-5"}>
            <h4 className="mb-3 flex items-center gap-2 border-b border-red/20 pb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-red">
              {col.heading}
            </h4>
            <ul className="flex flex-col gap-0.5">
              {col.items.map((it) => (
                <li key={it.label}>
                  <Link
                    href={it.href}
                    className="group/link flex items-center gap-2 rounded px-2 py-1 text-[12.5px] text-white/65 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    <span className="text-red opacity-0 transition group-hover/link:opacity-100">›</span>
                    <span className="-ml-2 transition group-hover/link:ml-0">{it.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {promo && (
          <div className="border-l border-white/10 pl-5">
            <div
              className={`flex h-full flex-col gap-2 overflow-hidden rounded-lg border p-4 ${
                promo.tone === "gold"
                  ? "border-gold/25 bg-[linear-gradient(135deg,rgba(245,166,35,0.18),rgba(245,166,35,0.04))]"
                  : "border-red/25 bg-[linear-gradient(135deg,rgba(232,21,27,0.22),rgba(232,21,27,0.04))]"
              }`}
            >
              <div
                className={`font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${
                  promo.tone === "gold" ? "text-gold" : "text-red"
                }`}
              >
                {promo.tag}
              </div>
              <div className="font-head text-lg font-extrabold uppercase leading-tight text-white">
                {promo.title}
              </div>
              <div className="flex-1 text-[11px] leading-relaxed text-white/65">{promo.sub}</div>
              {promo.cta && (
                <Link
                  href={promo.cta.href}
                  className={`mt-auto inline-block px-3.5 py-1.5 font-head text-xs font-bold uppercase tracking-wider transition ${
                    promo.tone === "gold"
                      ? "bg-gold text-black hover:brightness-110"
                      : "bg-red text-white hover:bg-red-600"
                  }`}
                  style={{ clipPath: "polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%)" }}
                >
                  {promo.cta.label} →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
