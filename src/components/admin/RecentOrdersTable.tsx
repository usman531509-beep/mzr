import Link from "next/link";
import { Package } from "lucide-react";
import { fmtMoney } from "@/lib/format";

export type RecentOrderRow = {
  id: string;
  orderNumber: string | null;
  product: string;
  image: string | null;
  date: string;
  status: string;
  total: number;
  customer: string;
};

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "DELIVERED" ? "border-ok/30 bg-ok/10 text-ok" :
    status === "PAID" || status === "SHIPPED" ? "border-red/25 bg-red-soft text-red" :
    status === "CANCELLED" ? "border-red/30 bg-red-soft text-red" :
    "border-gold/30 bg-gold/10 text-gold";
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

// "Recent orders" table in the reference layout: #, product (thumbnail + name),
// date, status pill, price and customer. Each row links to the order detail.
export function RecentOrdersTable({ rows }: { rows: RecentOrderRow[] }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-ink">Recent orders</h3>
        <Link href="/admin/orders" className="text-xs font-semibold text-red hover:underline">
          View all →
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
          No orders yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-3 font-semibold">#</th>
                <th className="pb-3 pr-3 font-semibold">Product</th>
                <th className="pb-3 pr-3 font-semibold">Date</th>
                <th className="pb-3 pr-3 font-semibold">Status</th>
                <th className="pb-3 pr-3 text-right font-semibold">Price</th>
                <th className="pb-3 font-semibold">Customer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t border-line/70 transition hover:bg-soft">
                  <td className="py-3 pr-3 text-muted-foreground">{i + 1}</td>
                  <td className="py-3 pr-3">
                    <Link href={`/admin/orders/${r.id}`} className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-soft">
                        {r.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.image} alt="" className="h-full w-full bg-white object-contain" />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground" />
                        )}
                      </span>
                      <span className="truncate font-semibold text-ink">{r.product}</span>
                    </Link>
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap text-muted-foreground">{r.date}</td>
                  <td className="py-3 pr-3"><StatusPill status={r.status} /></td>
                  <td className="py-3 pr-3 whitespace-nowrap text-right font-semibold text-ink">{fmtMoney(r.total)}</td>
                  <td className="py-3 whitespace-nowrap text-ink">{r.customer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
