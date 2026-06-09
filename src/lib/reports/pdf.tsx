/* eslint-disable jsx-a11y/alt-text */
// Shared PDF report template. Every report renders into the same shell
// (header with title + date range, optional KPI row, table, footer with
// page numbers) so exports look consistent and accountants don't have to
// adapt to a new layout per report.
//
// @react-pdf/renderer runs in plain Node — no headless Chrome, fits
// inside Vercel's function limits. The components below intentionally
// mirror html/css naming (View = div, Text = span) for readability.

import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0a0a0a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: "#e8151b",
    paddingBottom: 8,
    marginBottom: 16,
  },
  brand: { color: "#e8151b", fontFamily: "Helvetica-Bold", fontSize: 16, letterSpacing: 2 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 14, marginTop: 4 },
  rangeLabel: { color: "#444", fontSize: 9 },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 4,
    padding: 8,
    backgroundColor: "#fafafa",
  },
  kpiLabel: { color: "#666", fontSize: 8, textTransform: "uppercase", letterSpacing: 0.6 },
  kpiValue: { fontFamily: "Helvetica-Bold", fontSize: 13, marginTop: 4 },
  kpiSub: { color: "#888", fontSize: 8, marginTop: 2 },
  table: {
    borderWidth: 1,
    borderColor: "#d4d4d4",
    borderRadius: 4,
    overflow: "hidden",
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  trLast: { borderBottomWidth: 0 },
  th: {
    flex: 1,
    padding: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    backgroundColor: "#fafafa",
    color: "#444",
  },
  td: { flex: 1, padding: 6, fontSize: 9 },
  tdRight: { textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#888",
    fontSize: 8,
  },
});

export type PdfKpi = { label: string; value: string; sub?: string };

export type PdfColumn = {
  header: string;
  /** Flex value (default 1). Wider columns for long-form text. */
  flex?: number;
  /** Right-align numbers / money. */
  align?: "left" | "right";
};

export function ReportPdf({
  title,
  rangeLabel,
  kpis = [],
  columns,
  rows,
  generatedAt,
}: {
  title: string;
  rangeLabel: string;
  kpis?: PdfKpi[];
  columns: PdfColumn[];
  rows: string[][];
  generatedAt: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.brand}>MZR PARTS</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.rangeLabel}>{rangeLabel}</Text>
        </View>

        {/* KPIs */}
        {kpis.length > 0 && (
          <View style={styles.kpiRow}>
            {kpis.map((k) => (
              <View key={k.label} style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{k.label}</Text>
                <Text style={styles.kpiValue}>{k.value}</Text>
                {k.sub && <Text style={styles.kpiSub}>{k.sub}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Table */}
        <View style={styles.table}>
          {/* Header row */}
          <View style={styles.tr} fixed>
            {columns.map((c, i) => (
              <Text
                key={i}
                style={[
                  styles.th,
                  { flex: c.flex ?? 1 },
                  c.align === "right" ? styles.tdRight : {},
                ]}
              >
                {c.header}
              </Text>
            ))}
          </View>
          {/* Body */}
          {rows.map((row, i) => (
            <View
              key={i}
              style={[styles.tr, i === rows.length - 1 ? styles.trLast : {}]}
            >
              {columns.map((c, j) => (
                <Text
                  key={j}
                  style={[
                    styles.td,
                    { flex: c.flex ?? 1 },
                    c.align === "right" ? styles.tdRight : {},
                  ]}
                >
                  {row[j] ?? ""}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Generated {generatedAt}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

/** Helper to convert a Buffer/Stream from `renderToBuffer` to a Response. */
export function pdfResponse(filename: string, buf: Buffer): Response {
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
