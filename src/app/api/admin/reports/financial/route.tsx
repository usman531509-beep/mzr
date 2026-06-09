import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { requireReportAccess } from "@/lib/reports/auth";
import { resolveRange, rangeForFilename } from "@/lib/reports/date-range";
import { toCsv, csvResponse } from "@/lib/reports/csv";
import { ReportPdf, pdfResponse } from "@/lib/reports/pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GBP = (n: number) => `£${n.toFixed(2)}`;

export async function GET(req: Request) {
  const session = await requireReportAccess("reports.financial");
  if (!session) return NextResponse.json({ ok: false }, { status: 403 });

  const url = new URL(req.url);
  const sp: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { sp[k] = v; });
  const format = sp.format === "pdf" ? "pdf" : "csv";
  const range = resolveRange(sp);

  const orderWhere = range.from && range.to
    ? { createdAt: { gte: range.from, lte: range.to }, status: "DELIVERED" as const }
    : { status: "DELIVERED" as const };
  const itemWhere = range.from && range.to
    ? { order: { is: { createdAt: { gte: range.from, lte: range.to }, status: "DELIVERED" as const } } }
    : { order: { is: { status: "DELIVERED" as const } } };
  const expenseWhere = range.from && range.to ? { paidOn: { gte: range.from, lte: range.to } } : {};

  const [orderAgg, items, expenseAgg] = await Promise.all([
    prisma.order.aggregate({
      where: orderWhere,
      _sum: { total: true, shippingFee: true, discount: true },
      _count: { _all: true },
    }),
    prisma.orderItem.findMany({
      where: itemWhere,
      select: {
        quantity: true, price: true,
        product: { select: { costPrice: true } },
        costAllocations: { select: { qty: true, unitCost: true } },
      },
    }),
    prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
  ]);

  const revenue   = Number(orderAgg._sum.total ?? 0);
  const shipping  = Number(orderAgg._sum.shippingFee ?? 0);
  const discounts = Number(orderAgg._sum.discount ?? 0);
  let cogs = 0;
  let lineSubtotal = 0;
  for (const it of items) {
    lineSubtotal += Number(it.price) * it.quantity;
    if (it.costAllocations.length > 0) {
      for (const a of it.costAllocations) cogs += Number(a.unitCost) * a.qty;
    } else if (it.product.costPrice != null) {
      cogs += Number(it.product.costPrice) * it.quantity;
    }
  }
  const gross   = revenue - cogs;
  const expenses = Number(expenseAgg._sum.amount ?? 0);
  const net     = gross - expenses;
  const vatBase = Math.max(0, lineSubtotal + shipping - discounts);
  const vat     = +(vatBase * 0.2).toFixed(2);

  // Each row is one P&L line — CSV and PDF render the same shape.
  const rows = [
    { line: "Revenue (delivered orders)",  amount: revenue },
    { line: "Discounts applied",            amount: -discounts },
    { line: "Shipping collected",           amount: shipping },
    { line: "Cost of goods sold (FIFO)",    amount: -cogs },
    { line: "Gross profit",                 amount: gross },
    { line: "Operating expenses",           amount: -expenses },
    { line: "Net profit",                   amount: net },
    { line: "VAT base (line + ship − disc)",amount: vatBase },
    { line: "VAT collected (20%)",          amount: vat },
  ];

  await logActivity(session, {
    action: "report-exported",
    moduleKey: "reports",
    target: `financial · ${range.preset} · ${format}`,
    meta: { range: range.preset, format },
  });

  if (format === "csv") {
    const csv = toCsv(rows, [
      { header: "Line",          value: (r) => r.line },
      { header: "Amount (GBP)",  value: (r) => r.amount.toFixed(2) },
    ]);
    return csvResponse(`pnl_${rangeForFilename(range)}.csv`, csv);
  }

  const buf = await renderToBuffer(
    <ReportPdf
      title="Profit & Loss"
      rangeLabel={range.label}
      generatedAt={new Date().toISOString().slice(0, 16).replace("T", " ")}
      kpis={[
        { label: "Revenue", value: GBP(revenue) },
        { label: "Gross profit", value: GBP(gross), sub: revenue > 0 ? `${((gross / revenue) * 100).toFixed(1)}% margin` : "—" },
        { label: "Net profit", value: GBP(net) },
      ]}
      columns={[
        { header: "Line",         flex: 3 },
        { header: "Amount (GBP)", flex: 1.4, align: "right" },
      ]}
      rows={rows.map((r) => [
        r.line,
        r.amount < 0 ? `(${Math.abs(r.amount).toFixed(2)})` : r.amount.toFixed(2),
      ])}
    />,
  );
  return pdfResponse(`pnl_${rangeForFilename(range)}.pdf`, buf);
}
