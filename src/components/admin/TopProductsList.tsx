import Link from "next/link";
import { Package } from "lucide-react";
import { fmtMoney } from "@/lib/format";

type Row = {
  name: string;
  quantity: number;
  revenue: number;
  image: string | null;
  slug: string | null;
};

// "Top products" panel in the reference style: product thumbnail, name +
// units-sold, revenue on the right. Rows link to the storefront product page.
export function TopProductsList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white p-5">
        <h3 className="text-base font-bold text-ink">Top products</h3>
        <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
          No sales yet.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-ink">Top products</h3>
        <Link href="/admin/products" className="text-xs font-semibold text-red hover:underline">
          View all →
        </Link>
      </div>

      <ul className="divide-y divide-line">
        {rows.slice(0, 5).map((r, i) => {
          const body = (
            <div className="flex items-center gap-3 py-2.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-soft">
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image} alt="" className="h-full w-full bg-white object-contain" />
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.quantity} sold</div>
              </div>
              <div className="shrink-0 text-sm font-bold text-ink">{fmtMoney(r.revenue)}</div>
            </div>
          );
          return (
            <li key={i}>
              {r.slug ? (
                <Link href={`/products/${r.slug}`} className="block rounded-lg px-1 transition hover:bg-soft">
                  {body}
                </Link>
              ) : (
                <div className="px-1">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
