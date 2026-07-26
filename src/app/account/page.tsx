import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { ukHourNow, greetingFor, firstNameOf } from "@/lib/greeting";

// Per-request render so each customer sees their own data; prevents Vercel
// from accidentally caching a prerendered shell across users.
export const dynamic = "force-dynamic";

// Order status → reference .st badge tone (per account/index.html mockup:
// delivered=ok, dispatched=info, pending=muted/warn, cancelled=bad).
const ST_CLASS: Record<string, string> = {
  PENDING:   "st warn",
  PAID:      "st info",
  SHIPPED:   "st info",
  DELIVERED: "st ok",
  CANCELLED: "st bad",
};

export default async function AccountOverview() {
  const session = await auth();
  if (!session?.user) return null;
  const firstName = firstNameOf(session.user.name);
  const greeting = greetingFor(ukHourNow());

  const [orders, totalSpentAgg] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { items: true },
    }),
    prisma.order.aggregate({
      where: { userId: session.user.id },
      _sum: { total: true },
      _count: { _all: true },
    }),
  ]);

  return (
    <div>
      <header style={{ marginBottom: 22 }}>
        <h1 className="font-head text-3xl uppercase leading-none tracking-[0.02em]" style={{ margin: 0 }}>
          {greeting}, <span className="text-red">{firstName}</span>
        </h1>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>Welcome back to MZR Parts.</p>
      </header>

      <div className="stats">
        <div className="stat">
          <div className="lbl">Orders placed</div>
          <div className="val">{totalSpentAgg._count._all}</div>
        </div>
        <div className="stat">
          <div className="lbl">Lifetime spend</div>
          <div className="val">{fmtMoney(Number(totalSpentAgg._sum.total ?? 0))}</div>
        </div>
      </div>

      <div className="panel">
        <div className="flex between" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Recent orders</h3>
          <Link href="/account/orders" style={{ fontSize: 14, fontWeight: 600 }}>View all →</Link>
        </div>

        {orders.length === 0 ? (
          <div style={{ border: "1px dashed var(--line)", borderRadius: 8, padding: 32, textAlign: "center" }}>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>No orders yet.</p>
            <Link
              href="/products"
              className="btn btn-red btn-sm mt"
              // theme.css re-declares .btn-red later (hero CTA variant) which
              // out-cascades .btn-sm — restate the small-button metrics.
              style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, letterSpacing: ".02em", textTransform: "none", fontWeight: 700, boxShadow: "none" }}
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <table className="t">
            <thead>
              <tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.orderNumber ?? `${o.id.slice(0, 12)}…`}</td>
                  <td>{new Date(o.createdAt).toLocaleDateString("en-GB")}</td>
                  <td>{o.items.length}</td>
                  <td>{fmtMoney(Number(o.total))}</td>
                  <td><span className={ST_CLASS[o.status] ?? "st muted"}>{o.status}</span></td>
                  <td><Link href="/account/orders">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
