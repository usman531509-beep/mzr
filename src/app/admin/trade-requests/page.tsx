import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TradeRequestActions } from "@/components/admin/TradeRequestActions";
import { TradeRequestView } from "@/components/admin/TradeRequestView";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { Briefcase, UserCheck } from "lucide-react";
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

// Row shape includes the `user` relation we eagerly load above. We type
// it explicitly (instead of inferring from `findMany`) so the linked-user
// existence check in TradeRequestActions has the field on hand.
type RequestRow = Awaited<ReturnType<typeof prisma.tradeAccountRequest.findMany>>[number] & {
  user: { id: string; email: string; tradeApproved: boolean } | null;
};

function Section({
  title, empty, rows, showActions,
}: {
  title: string;
  empty: string;
  rows: RequestRow[];
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="align-top">
                  <TableCell>
                    <div className="font-medium">{r.contactName}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                    <div className="text-xs text-muted-foreground">{r.phone}</div>
                    {/* Linked-account hint — answers "where's the account
                        for this approved request?" inline instead of
                        making the admin go hunt in /admin/users. */}
                    {r.user && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-300">
                        <UserCheck className="h-3 w-3" />
                        Linked to user account
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.companyName}</div>
                    <div className="text-xs text-muted-foreground">
                      {[r.businessType, r.vatNumber && `VAT: ${r.vatNumber}`]
                        .filter(Boolean).join(" · ")}
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      {/* UK postal address — line 1 / line 2 / city / county
                          / postcode / country. Empty parts collapse. */}
                      {[
                        r.address,
                        r.addressLine2,
                        r.city,
                        r.county,
                        r.postcode,
                        r.country,
                      ].filter(Boolean).join(", ")}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{r.monthlyVolume ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.createdAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <TradeRequestView
                        request={{
                          id: r.id,
                          status: r.status,
                          createdAt: r.createdAt.toISOString(),
                          contactName: r.contactName,
                          email: r.email,
                          phone: r.phone,
                          companyName: r.companyName,
                          companyWebsite: r.companyWebsite,
                          vatNumber: r.vatNumber,
                          businessType: r.businessType,
                          monthlyVolume: r.monthlyVolume,
                          address: r.address,
                          addressLine2: r.addressLine2,
                          city: r.city,
                          county: r.county,
                          postcode: r.postcode,
                          country: r.country,
                          notes: r.notes,
                          decisionNote: r.decisionNote,
                          decidedAt: r.decidedAt?.toISOString() ?? null,
                        }}
                      />
                      {/* Once a request is linked to a real user, give the
                          admin a one-click route to that profile. Especially
                          useful for approved rows in the History section,
                          where the action set is otherwise empty. */}
                      {r.user && (
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                          <Link href={`/admin/users?q=${encodeURIComponent(r.user.email)}`}>
                            <UserCheck className="h-3.5 w-3.5" /> View account
                          </Link>
                        </Button>
                      )}
                      {showActions && (
                        <TradeRequestActions
                          id={r.id}
                          hasLinkedUser={!!r.user}
                          applicantEmail={r.email}
                          applicantName={r.contactName}
                        />
                      )}
                    </div>
                  </TableCell>
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
