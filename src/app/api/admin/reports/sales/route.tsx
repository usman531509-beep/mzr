import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { requireReportAccess } from "@/lib/reports/auth";
import { resolveRange, rangeForFilename } from "@/lib/reports/date-range";
import { toCsv, csvResponse } from "@/lib/reports/csv";
import { ReportPdf, pdfResponse } from "@/lib/reports/pdf";

export const dynamic = "force-dynamic";
// Reports can render a fair chunk of HTML→PDF. Bump the function ceiling
// so a 90-day export with a few thousand products doesn't time out.
export const maxDuration = 60;

const GBP = (n: number) => `£${n.toFixed(2)}`;

export async function GET(req: Request) {
  const session = await requireReportAccess("reports.view");
  if (!session) return NextResponse.json({ ok: false }, { status: 403 });

  const url = new URL(req.url);
  const sp: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { sp[k] = v; });
  const format = sp.format === "pdf" ? "pdf" : "csv";
  const range = resolveRange(sp);

  const where = range.from && range.to
    ? { createdAt: { gte: range.from, lte: range.to }, status: "DELIVERED" as const }
    : { status: "DELIVERED" as const };

  // Same query shape as the screen view so figures match exactly.
  // Run the line-item scan and the order aggregate in parallel — they
  // touch different tables and don't depend on each other.
  const [items, orderAgg] = await Promise.all([
    prisma.orderItem.findMany({
      where: range.from && range.to
        ? { order: { is: { createdAt: { gte: range.from, lte: range.to }, status: "DELIVERED" } } }
        : { order: { is: { status: "DELIVERED" } } },
      select: {
        productId: true, name: true, quantity: true,
        price: true, originalPrice: true,
      },
    }),
    prisma.order.aggregate({
      where, _sum: { total: true }, _count: { _all: true },
    }),
  ]);

  const productAgg = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const it of items) {
    const line = Number(it.price) * it.quantity;
    const cur = productAgg.get(it.productId);
    if (cur) { cur.qty += it.quantity; cur.revenue += line; }
    else productAgg.set(it.productId, { name: it.name, qty: it.quantity, revenue: line });
  }
  const rows = [...productAgg.values()].sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = Number(orderAgg._sum.total ?? 0);

  await logActivity(session, {
    action: "report-exported",
    moduleKey: "reports",
    target: `sales · ${range.preset} · ${format}`,
    meta: { range: range.preset, format, rows: rows.length },
  });

  if (format === "csv") {
    const csv = toCsv(rows, [
      { header: "Product", value: (r) => r.name },
      { header: "Units sold", value: (r) => r.qty },
      { header: "Revenue (GBP)", value: (r) => r.revenue.toFixed(2) },
    ]);
    return csvResponse(`sales_${rangeForFilename(range)}.csv`, csv);
  }

  const buf = await renderToBuffer(
    <ReportPdf
      title="Sales report"
      rangeLabel={range.label}
      generatedAt={new Date().toISOString().slice(0, 16).replace("T", " ")}
      kpis={[
        { label: "Revenue", value: GBP(totalRevenue), sub: `${orderAgg._count._all} delivered orders` },
        { label: "Units sold", value: String(items.reduce((s, i) => s + i.quantity, 0)) },
        { label: "Products", value: String(rows.length) },
      ]}
      columns={[
        { header: "Product", flex: 3 },
        { header: "Units", flex: 1, align: "right" },
        { header: "Revenue (GBP)", flex: 1.4, align: "right" },
      ]}
      rows={rows.map((r) => [r.name, String(r.qty), r.revenue.toFixed(2)])}
    />,
  );
  return pdfResponse(`sales_${rangeForFilename(range)}.pdf`, buf);
}
