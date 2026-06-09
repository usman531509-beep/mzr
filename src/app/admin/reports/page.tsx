import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LineChart, Boxes, PoundSterling, ArrowRight, Download, FileText,
} from "lucide-react";
import { auth } from "@/auth";
import { canAccessModule } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

// Reports landing — tile-per-area with a short description so admins
// know what's behind each link without having to click through. Tiles
// are filtered by permission: STAFF without `reports.financial` won't
// see the Financial tile but still see Sales / Inventory.

const TILES = [
  {
    key: "reports.view",
    href: "/admin/reports/sales",
    icon: LineChart,
    title: "Sales",
    blurb:
      "Sales by period, top products, top customers, payment-method split, and trade vs. retail revenue.",
  },
  {
    key: "reports.view",
    href: "/admin/reports/inventory",
    icon: Boxes,
    title: "Inventory",
    blurb:
      "Current stock valuation at retail + cost, low-stock alerts, and per-product stock-on-hand breakdown.",
  },
  {
    key: "reports.financial",
    href: "/admin/reports/financial",
    icon: PoundSterling,
    title: "Financial",
    blurb:
      "Profit & loss summary revenue, FIFO cost of goods sold, gross profit, expenses, net profit.",
  },
] as const;

export default async function ReportsLandingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = session.user.role as string | undefined;
  const perms = session.user.permissions as string[] | undefined;
  const visible = TILES.filter((t) => canAccessModule(role, perms, t.key));

  // If the user has no report access at all, kick them back to the
  // dashboard instead of showing an empty page.
  if (visible.length === 0) redirect("/admin");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Analyse the business, surface trends, and export polished CSV /
          PDF for your accountant. Every report respects the date-range
          picker pick a window and the figures update.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((t) => (
          <Link key={t.href} href={t.href} className="group">
            <Card className="h-full transition group-hover:border-primary/50">
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-red/12 text-red ring-1 ring-inset ring-red/20">
                    <t.icon className="h-5 w-5" />
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight">{t.title}</h2>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{t.blurb}</p>
                <div className="mt-auto flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-red transition group-hover:translate-x-0.5">
                  Open report <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Export legend — clarifies what the two buttons inside each
          report actually produce, so admins don't have to guess. */}
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              <Download className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold">CSV export</div>
              <p className="text-xs text-muted-foreground">
                Raw data, one row per record. Open in Excel / Numbers / Google Sheets to slice further or feed accounting software.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold">PDF export</div>
              <p className="text-xs text-muted-foreground">
                A polished printable copy with headline KPIs and the same table — share with your accountant or file for audit.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
