import Link from "next/link";
import {
  Bike, BatteryFull, CircleDot, Cog, Disc, Filter, Flame, Lightbulb,
  Package, ShieldCheck, Sparkles, Wind, Wrench, Zap,
  type LucideIcon,
} from "lucide-react";
import type { NavCategoryNode } from "@/lib/nav-cache";

// Keyword → icon. Picked once per render against the slug AND the name so
// the icon usually matches even when the admin names a category in a way
// the fallback emoji table couldn't predict ("Clutch shoe set", "Variators",
// "Belt kits", etc).
const ICON_RULES: Array<{ match: RegExp; Icon: LucideIcon }> = [
  { match: /\b(brake|disc|pad|caliper|rotor|shoe)\b/i, Icon: Disc },
  { match: /\b(tyre|tire|wheel|rim)\b/i,               Icon: CircleDot },
  { match: /\b(exhaust|muffler|pipe)\b/i,              Icon: Wind },
  { match: /\b(engine|piston|cylinder|crank|cam|gasket)\b/i, Icon: Cog },
  { match: /\b(electrical|electric|wiring|ecu|ignition|starter)\b/i, Icon: Zap },
  { match: /\b(battery|batteries)\b/i,                 Icon: BatteryFull },
  { match: /\b(light|lamp|headlight|bulb|indicator)\b/i, Icon: Lightbulb },
  { match: /\b(filter|filtration|oil filter|air filter)\b/i, Icon: Filter },
  { match: /\b(oil|fluid|lube|coolant)\b/i,            Icon: Sparkles },
  { match: /\b(clutch|gear|transmission|cvt|belt|variator)\b/i, Icon: Cog },
  { match: /\b(suspension|fork|shock|spring)\b/i,      Icon: Wrench },
  { match: /\b(body|fairing|panel|seat)\b/i,           Icon: Wrench },
  { match: /\b(chain|sprocket)\b/i,                    Icon: Cog },
  { match: /\b(helmet|gear|jacket|glove|safety)\b/i,   Icon: ShieldCheck },
  { match: /\b(performance|tune|sport|race)\b/i,       Icon: Flame },
  { match: /\b(accessor|kit|tool)\b/i,                 Icon: Wrench },
];

function pickIcon(slug: string, name: string): LucideIcon {
  const haystack = `${slug} ${name}`;
  for (const { match, Icon } of ICON_RULES) if (match.test(haystack)) return Icon;
  // Sensible last-resort icons by depth/word-length so two adjacent tiles
  // rarely share the same generic shape.
  return /set|kit/i.test(haystack) ? Package : Bike;
}

type CategoryWithImage = NavCategoryNode & { imageUrl?: string | null };

export function CategoriesGrid({
  categories,
}: {
  categories: CategoryWithImage[];
}) {
  return (
    <section id="categories" className="mx-auto max-w-site px-[var(--gutter)] py-14">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="eyebrow mb-2">Browse the catalogue</div>
          <h2 className="section-h2">
            Shop by <em>category</em>
          </h2>
        </div>
        <Link
          href="/products"
          className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap border-b border-red/40 pb-0.5 font-head text-[13px] font-bold uppercase tracking-wider text-red transition hover:opacity-70"
        >
          View all parts →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {categories.map((c) => {
          const Icon = pickIcon(c.slug, c.name);
          return (
            <Link
              key={c.id}
              href={`/products?category=${c.path}`}
              className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-ink-800/60 px-4 py-6 text-center transition hover:-translate-y-0.5 hover:border-red/40 hover:bg-ink-800"
            >
              {c.imageUrl ? (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-ink-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-700 text-white/75 transition group-hover:text-red">
                  <Icon className="h-8 w-8" strokeWidth={1.6} />
                </span>
              )}
              <span className="line-clamp-2 font-head text-[17px] font-extrabold uppercase leading-tight tracking-wide text-white">
                {c.name}
              </span>
              {c.productCount > 0 && (
                <span className="text-[12.5px] tabular-nums text-white/50">
                  {c.productCount} part{c.productCount === 1 ? "" : "s"}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
