import Link from "next/link";

const ICONS: Record<string, string> = {
  engine: "🔧",
  body: "🛠️",
  tyres: "🛞",
  brakes: "🛑",
  electrical: "⚡",
  suspension: "🪛",
};

export function CategoriesGrid({
  categories,
}: {
  categories: { id: string; name: string; slug: string }[];
}) {
  return (
    <section id="categories" className="mx-auto max-w-site px-[var(--gutter)] py-16">
      <div className="mb-9 flex items-end justify-between gap-5">
        <div>
          <div className="eyebrow mb-2">Browse the catalogue</div>
          <h2 className="section-h2">
            Shop by <em>category</em>
          </h2>
        </div>
        <Link href="/products" className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap border-b border-red/40 pb-0.5 font-head text-[13px] font-bold uppercase tracking-wider text-red transition hover:opacity-70">
          View all parts →
        </Link>
      </div>

      <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(118px,1fr))]">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/products?category=${c.slug}`}
            className="group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-lg border border-white/10 bg-ink-800 px-3 py-4 text-center transition hover:-translate-y-1 hover:border-red/45 hover:shadow-[0_8px_28px_rgba(0,0,0,0.5),0_0_0_1px_rgba(232,21,27,0.15)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red/[0.08] to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded bg-ink-700 text-xl transition group-hover:scale-110">
              {ICONS[c.slug] ?? "📦"}
            </div>
            <span className="relative z-10 font-head text-[11px] font-bold uppercase tracking-wide text-white/85">
              {c.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
