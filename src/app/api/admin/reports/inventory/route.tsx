import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { requireReportAccess } from "@/lib/reports/auth";
import { resolveRange } from "@/lib/reports/date-range";
import { toCsv, csvResponse } from "@/lib/reports/csv";
import { ReportPdf, pdfResponse } from "@/lib/reports/pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GBP = (n: number) => `£${n.toFixed(2)}`;

export async function GET(req: Request) {
  const session = await requireReportAccess("reports.view");
  if (!session) return NextResponse.json({ ok: false }, { status: 403 });

  const url = new URL(req.url);
  const sp: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { sp[k] = v; });
  const format = sp.format === "pdf" ? "pdf" : "csv";
  const range = resolveRange(sp, "all");

  const orderItemWhere = range.from && range.to
    ? { order: { is: { createdAt: { gte: range.from, lte: range.to }, status: "DELIVERED" as const } } }
    : { order: { is: { status: "DELIVERED" as const } } };

  const [products, soldAgg] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, deletedAt: null },
      select: {
        id: true, name: true, sku: true, stock: true, price: true, costPrice: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: orderItemWhere,
      _sum: { quantity: true },
    }),
  ]);
  const soldByProduct = new Map<string, number>(
    soldAgg.map((r) => [r.productId, r._sum.quantity ?? 0]),
  );

  const rows = products.map((p) => {
    const retail = Number(p.price) * p.stock;
    const cost = p.costPrice ? Number(p.costPrice) * p.stock : 0;
    return {
      name: p.name,
      sku: p.sku ?? "",
      brand: p.brand?.name ?? "",
      category: p.category?.name ?? "",
      stock: p.stock,
      soldInPeriod: soldByProduct.get(p.id) ?? 0,
      unitCost: p.costPrice ? Number(p.costPrice) : 0,
      unitRetail: Number(p.price),
      valueCost: cost,
      valueRetail: retail,
    };
  }).sort((a, b) => b.valueRetail - a.valueRetail);

  const totalUnits  = rows.reduce((s, r) => s + r.stock, 0);
  const totalCost   = rows.reduce((s, r) => s + r.valueCost, 0);
  const totalRetail = rows.reduce((s, r) => s + r.valueRetail, 0);

  await logActivity(session, {
    action: "report-exported",
    moduleKey: "reports",
    target: `inventory · ${format}`,
    meta: { format, rows: rows.length },
  });

  const soldHeader = `Sold (${range.label})`;
  if (format === "csv") {
    const csv = toCsv(rows, [
      { header: "Product",        value: (r) => r.name },
      { header: "SKU",            value: (r) => r.sku },
      { header: "Category",       value: (r) => r.category },
      { header: "Brand",          value: (r) => r.brand },
      { header: "Stock",          value: (r) => r.stock },
      { header: soldHeader,       value: (r) => r.soldInPeriod },
      { header: "Unit cost",      value: (r) => r.unitCost.toFixed(2) },
      { header: "Unit retail",    value: (r) => r.unitRetail.toFixed(2) },
      { header: "Value @ cost",   value: (r) => r.valueCost.toFixed(2) },
      { header: "Value @ retail", value: (r) => r.valueRetail.toFixed(2) },
    ]);
    return csvResponse(`inventory_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  const buf = await renderToBuffer(
    <ReportPdf
      title="Inventory report"
      rangeLabel={`Snapshot at ${new Date().toISOString().slice(0, 16).replace("T", " ")} · sold-in-period: ${range.label}`}
      generatedAt={new Date().toISOString().slice(0, 16).replace("T", " ")}
      kpis={[
        { label: "Total units", value: String(totalUnits), sub: `${rows.length} products` },
        { label: "Value @ cost", value: GBP(totalCost) },
        { label: "Value @ retail", value: GBP(totalRetail), sub: `Margin ${GBP(totalRetail - totalCost)}` },
      ]}
      columns={[
        { header: "Product",       flex: 3 },
        { header: "Stock",         flex: 0.8, align: "right" },
        { header: soldHeader,      flex: 1,   align: "right" },
        { header: "Unit cost",     flex: 1,   align: "right" },
        { header: "Unit retail",   flex: 1,   align: "right" },
        { header: "Value @ cost",  flex: 1.2, align: "right" },
        { header: "Value @ retail",flex: 1.2, align: "right" },
      ]}
      rows={rows.map((r) => [
        r.name,
        String(r.stock),
        r.soldInPeriod > 0 ? String(r.soldInPeriod) : "—",
        r.unitCost ? r.unitCost.toFixed(2) : "—",
        r.unitRetail.toFixed(2),
        r.valueCost.toFixed(2),
        r.valueRetail.toFixed(2),
      ])}
    />,
  );
  return pdfResponse(`inventory_${new Date().toISOString().slice(0, 10)}.pdf`, buf);
}
