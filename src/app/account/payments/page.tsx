import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fmtMoney } from "@/lib/format";
import { Pagination } from "@/components/Pagination";
import { parsePagination } from "@/lib/pagination";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

// Payment status → reference .st badge tone + label (payments.html mockup:
// Succeeded=ok; failures=bad, refunds=info, pending=warn, canceled=muted).
const STATUS_META: Record<string, { label: string; st: string }> = {
  SUCCEEDED: { label: "Paid",     st: "st ok" },
  PENDING:   { label: "Pending",  st: "st warn" },
  FAILED:    { label: "Failed",   st: "st bad" },
  CANCELED:  { label: "Canceled", st: "st muted" },
  REFUNDED:  { label: "Refunded", st: "st info" },
};

export default async function MyPaymentsPage({ searchParams }: { searchParams: SP }) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const sp = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(sp, { defaultSize: 10 });

  // Match payments either by userId (signed-in customer) OR by an order
  // whose customerEmail equals theirs — covers guest checkouts they
  // completed before signing in.
  const where = {
    OR: [
      { userId: session.user.id },
      { order: { customerEmail: session.user.email ?? "" } },
    ],
  };
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        order: {
          select: {
            id: true, orderNumber: true, status: true,
            total: true, createdAt: true,
          },
        },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return (
    <div>
      <header style={{ marginBottom: 22 }}>
        <h1 className="font-head text-3xl uppercase leading-none tracking-[0.02em]" style={{ margin: 0 }}>
          My payments
        </h1>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>
          {total} payment{total === 1 ? "" : "s"} on record.
        </p>
      </header>

      {payments.length === 0 ? (
        <div className="panel" style={{ padding: 48, textAlign: "center" }}>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            You haven&apos;t made any card payments yet.
          </p>
        </div>
      ) : (
        <div>
          <div className="panel">
            <table className="t">
              <thead>
                <tr>
                  <th>Payment ID</th><th>Order</th><th>Date</th><th>Method</th>
                  <th>Amount</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const meta = STATUS_META[p.status] ?? STATUS_META.PENDING;
                  const ref = p.order.orderNumber ?? `#${p.order.id.slice(0, 8)}…`;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontSize: 12 }} className="muted">{p.providerPaymentId}</td>
                      <td>
                        <Link href="/account/orders" style={{ color: "var(--ink)", fontWeight: 600 }}>
                          {ref}
                        </Link>
                      </td>
                      <td>{new Date(p.createdAt).toLocaleString("en-GB")}</td>
                      <td style={{ textTransform: "capitalize" }}>{p.provider}</td>
                      <td style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {fmtMoney(Number(p.amount))}{" "}
                        <span className="muted" style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 600 }}>
                          {p.currency}
                        </span>
                      </td>
                      <td>
                        <span className={meta.st}>{meta.label}</span>
                        {p.failureMessage && (
                          <div style={{ fontSize: 11, color: "var(--bad)", marginTop: 4 }}>
                            {p.failureMessage}
                          </div>
                        )}
                      </td>
                      <td>
                        {p.receiptUrl ? (
                          <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer">
                            Receipt
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination total={total} pageSize={pageSize} currentPage={page} />
        </div>
      )}
    </div>
  );
}
