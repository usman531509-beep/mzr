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
// Trailing boundary intentionally omitted so plurals ("brakes", "tyres")
// and suffixed names ("paddds") still match the singular keyword.
const ICON_RULES: Array<{ match: RegExp; Icon: LucideIcon }> = [
  { match: /\b(brake|disc|pad|caliper|rotor|shoe)/i, Icon: Disc },
  { match: /\b(tyre|tire|wheel|rim)/i,               Icon: CircleDot },
  { match: /\b(exhaust|muffler|pipe)/i,              Icon: Wind },
  { match: /\b(engine|piston|cylinder|crank|cam|gasket)/i, Icon: Cog },
  { match: /\b(electrical|electric|wiring|ecu|ignition|starter)/i, Icon: Zap },
  { match: /\b(batter)/i,                            Icon: BatteryFull },
  { match: /\b(light|lamp|headlight|bulb|indicator)/i, Icon: Lightbulb },
  { match: /\b(filter|filtration)/i,                 Icon: Filter },
  { match: /\b(oil|fluid|lube|coolant)/i,            Icon: Sparkles },
  { match: /\b(clutch|gear|transmission|cvt|belt|variator)/i, Icon: Cog },
  { match: /\b(suspension|fork|shock|spring)/i,      Icon: Wrench },
  { match: /\b(body|fairing|panel|seat)/i,           Icon: Wrench },
  { match: /\b(chain|sprocket)/i,                    Icon: Cog },
  { match: /\b(helmet|jacket|glove|safety)/i,        Icon: ShieldCheck },
  { match: /\b(performance|tune|sport|race)/i,       Icon: Flame },
  { match: /\b(accessor|kit|tool)/i,                 Icon: Wrench },
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
  // Biggest catalogue first, then render every category as an equal-size
  // tile in a responsive row (2 cols on mobile, 3 on tablet, 4 on desktop).
  const ordered = [...categories].sort((a, b) => b.productCount - a.productCount);

  return (
    <section id="categories" className="h-section">
      <div className="h-container">
        <div className="h-sec-head">
          <div>
            <div className="label">Shop By Category</div>
            <h2>Built for every bay.</h2>
            <p className="sub">
              From service essentials to performance upgrades — the core
              systems your bike depends on.
            </p>
          </div>
          <Link href="/products" className="h-link">View all parts →</Link>
        </div>

        <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 lg:grid-cols-4">
          {ordered.map((c) => (
            <CategoryTile key={c.id} c={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryTile({ c }: { c: CategoryWithImage }) {
  const Icon = pickIcon(c.slug, c.name);
  const count = `${c.productCount} part${c.productCount === 1 ? "" : "s"}`;
  return (
    <Link href={`/products?category=${c.path}`} className="h-cat !h-[240px]">
      {c.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.imageUrl} alt="" />
      ) : (
        <div className="flex h-[65%] w-full items-center justify-center bg-white">
          <Icon className="h-12 w-12 text-red" strokeWidth={1.2} />
        </div>
      )}
      <div className="h-cat-body">
        <div className="h-cat-eyebrow">{count}</div>
        <h3>{c.name}</h3>
      </div>
    </Link>
  );
}
