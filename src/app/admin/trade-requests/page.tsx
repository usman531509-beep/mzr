import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TradeRequestActions } from "@/components/admin/TradeRequestActions";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { Briefcase } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function TradeRequestsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.status === "string" ? sp.status : "";

  const where: Prisma.TradeAccountRequestWhereInput = {};
  if (q) {
    where.OR = [
      { contactName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { companyName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status === "PENDING" || status === "APPROVED" || status === "REJECTED") {
    where.status = status;
  }

  const requests = await prisma.tradeAccountRequest.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { id: true, email: true, tradeApproved: true } } },
  });

  const pending = requests.filter((r) => r.status === "PENDING");
  const decided = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trade Requests</h1>
        <p className="text-sm text-muted-foreground">
          Review applications from businesses requesting a trade account.
        </p>
      </div>

      <AdminFilterBar
        searchPlaceholder="Search applicant, company, email…"
        filters={[
          { param: "status", label: "Status", any: "All statuses", options: [
            { value: "PENDING",  label: "Pending"  },
            { value: "APPROVED", label: "Approved" },
            { value: "REJECTED", label: "Rejected" },
          ]},
        ]}
      />

      <Section
        title="Pending"
        empty="No pending applications."
        rows={pending}
        showActions
      />

      <Section
        title="History"
        empty="No previous decisions."
        rows={decided}
      />
    </div>
  );
}

function Section({
  title, empty, rows, showActions,
}: {
  title: string;
  empty: string;
  rows: Awaited<ReturnType<typeof prisma.tradeAccountRequest.findMany>>;
  showActions?: boolean;
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <Briefcase className="h-6 w-6" />
            <p>{empty}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                {showActions && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="align-top">
                  <TableCell>
                    <div className="font-medium">{r.contactName}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                    <div className="text-xs text-muted-foreground">{r.phone}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.companyName}</div>
                    <div className="text-xs text-muted-foreground">
                      {[r.businessType, r.vatNumber && `VAT: ${r.vatNumber}`]
                        .filter(Boolean).join(" · ")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[r.address, r.city, r.country].filter(Boolean).join(", ")}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{r.monthlyVolume ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.createdAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <TradeRequestActions id={r.id} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  if (status === "APPROVED") return <Badge className="bg-green-600 hover:bg-green-600">Approved</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}
