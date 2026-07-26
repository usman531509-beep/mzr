import Link from "next/link";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { InvoiceDialog } from "@/components/InvoiceDialog";
import { Pagination } from "@/components/Pagination";
import { parsePagination } from "@/lib/pagination";

// Per-request render so each customer sees their own orders (and any tracking
// info added since their last visit) without stale cached HTML.
export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

// Compact button sizing — theme.css re-declares .btn-red/.btn-ghost later in
// the file (hero CTA variants) which out-cascades .btn-sm, so small inline
// actions restate the reference small-button metrics here.
const smBtn: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8, fontSize: 13,
  letterSpacing: ".02em", textTransform: "none", fontWeight: 700, boxShadow: "none",
};

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  const session = await auth();
  if (!session?.user) return null;
  const sp = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(sp, { defaultSize: 10 });

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        items: true,
        createdByAdmin: { select: { name: true, email: true } },
        courier: { select: { name: true, trackingUrl: true } },
      },
    }),
    prisma.order.count({ where: { userId: session.user.id } }),
  ]);

  // Lazily backfill missing paymentTokens on PENDING orders so the customer
  // can always resume payment from this page — covers historical orders
  // placed before the token was minted automatically at checkout.
  const needsToken = orders.filter((o) => o.status === "PENDING" && !o.paymentToken);
  if (needsToken.length > 0) {
    await Promise.all(
      needsToken.map(async (o) => {
        const token = randomBytes(18).toString("base64url");
        await prisma.order.update({ where: { id: o.id }, data: { paymentToken: token } });
        o.paymentToken = token;
      }),
    );
  }

  return (
    <div>
      <header style={{ marginBottom: 22 }}>
        <h1 className="font-head text-3xl uppercase leading-none tracking-[0.02em]" style={{ margin: 0 }}>
          My orders
        </h1>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>
          {total} order{total === 1 ? "" : "s"} placed.
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="panel" style={{ padding: 48, textAlign: "center" }}>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>You haven&apos;t placed an order yet.</p>
        </div>
      ) : (
        <div>
          {orders.map((o) => (
            <div className="panel" key={o.id}>
              <div className="flex between" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0 }}>Order {o.orderNumber ?? o.id}</h3>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                    Placed {new Date(o.createdAt).toLocaleString("en-GB")}
                  </div>
                  {o.createdByAdmin && (
                    <span className="tag-inline" style={{ marginTop: 6 }}>Created by admin</span>
                  )}
                </div>
                <div className="flex" style={{ gap: 12 }}>
                  <OrderStatusBadge status={o.status} />
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{fmtMoney(Number(o.total))}</div>
                </div>
              </div>

              <div className="hr" />

              <table className="t">
                <thead>
                  <tr><th>Item</th><th>Qty</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {o.items.map((i) => (
                    <tr key={i.id}>
                      <td>{i.name}</td>
                      <td>{i.quantity}</td>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>
                        {fmtMoney(Number(i.price) * i.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {o.trackingNumber && o.courier && (() => {
                // Append the tracking number to the courier's tracking URL as
                // a path segment so the customer lands directly on the
                // shipment page (mirrors the /track flow).
                const n = encodeURIComponent(o.trackingNumber);
                const base = o.courier.trackingUrl;
                const trackHref = base.endsWith("/") ? `${base}${n}` : `${base}/${n}`;
                return (
                  <>
                    <div className="hr" />
                    <div className="flex between" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div>
                        <h4 style={{ margin: "0 0 6px", fontSize: 13, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--muted)" }}>
                          Tracking
                        </h4>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{o.courier.name}</div>
                        <div className="muted" style={{ fontSize: 13 }}>{o.trackingNumber}</div>
                      </div>
                      <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
                        <a className="btn btn-ghost btn-sm" style={smBtn} href={trackHref} target="_blank" rel="noopener noreferrer">
                          Track on {o.courier.name}
                        </a>
                        <Link
                          className="btn btn-ghost btn-sm"
                          style={smBtn}
                          href={`/track?courier=${encodeURIComponent(o.courier.name)}&number=${encodeURIComponent(o.trackingNumber)}`}
                        >
                          Use tracking page →
                        </Link>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Admin-created orders that are still PENDING carry a
                  paymentToken. Surface a prominent Pay now CTA so the
                  customer can settle without hunting for the email. */}
              {o.status === "PENDING" && o.paymentToken && (
                <div
                  className="flex between mt"
                  style={{ flexWrap: "wrap", background: "var(--red-soft)", borderRadius: 8, padding: "12px 14px" }}
                >
                  <div style={{ fontSize: 14 }}>
                    <div style={{ fontWeight: 700 }}>Payment due</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Complete payment to ship this order.
                    </div>
                  </div>
                  <Link className="btn btn-red btn-sm" style={smBtn} href={`/pay/${o.paymentToken}`}>
                    Pay now
                  </Link>
                </div>
              )}

              <div className="hr" />

              <div className="flex between" style={{ flexWrap: "wrap" }}>
                <div className="muted" style={{ fontSize: 13 }}>
                  Shipping to: {[
                    o.customerName,
                    o.shippingAddress,
                    o.shippingAddressLine2,
                    o.shippingCity,
                    o.shippingCounty,
                    o.shippingPostcode,
                    o.shippingCountry,
                  ].filter(Boolean).join(", ")}
                </div>
                <InvoiceDialog
                  order={{
                    id: o.id,
                    orderNumber: o.orderNumber,
                    status: o.status,
                    total: o.total.toString(),
                    shippingFee: o.shippingFee.toString(),
                    discount: o.discount.toString(),
                    createdAt: o.createdAt,
                    customerName: o.customerName,
                    customerEmail: o.customerEmail,
                    customerPhone: o.customerPhone,
                    shippingAddress: o.shippingAddress,
                    shippingAddressLine2: o.shippingAddressLine2,
                    shippingCity: o.shippingCity,
                    shippingCounty: o.shippingCounty,
                    shippingPostcode: o.shippingPostcode,
                    shippingCountry: o.shippingCountry,
                    notes: o.notes,
                    items: o.items.map((it) => ({
                      id: it.id,
                      name: it.name,
                      price: it.price.toString(),
                      quantity: it.quantity,
                    })),
                  }}
                />
              </div>
            </div>
          ))}
          <Pagination total={total} pageSize={pageSize} currentPage={page} />
        </div>
      )}
    </div>
  );
}
