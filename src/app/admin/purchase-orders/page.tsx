import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { POClient } from "@/components/admin/POClient";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const supplierId = typeof sp.supplier === "string" ? sp.supplier : "";

  const where: Prisma.PurchaseOrderWhereInput = {};
  if (q) {
    where.OR = [
      { poNumber: { contains: q, mode: "insensitive" } },
      { supplier: { name: { contains: q, mode: "insensitive" } } },
      { notes:    { contains: q, mode: "insensitive" } },
    ];
  }
  if (status === "DRAFT" || status === "PLACED" || status === "RECEIVED" || status === "CANCELLED") {
    where.status = status;
  }
  if (supplierId) where.supplierId = supplierId;

  const [pos, suppliers] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { select: { id: true, name: true, quantity: true, unitCost: true } },
        createdByAdmin: { select: { name: true, email: true } },
      },
      take: 200,
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">
            Record what you order from suppliers. Marking a PO as Received bumps stock automatically.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/purchase-orders/new">
            <Plus className="h-3.5 w-3.5" /> New purchase order
          </Link>
        </Button>
      </div>

      <AdminFilterBar
        searchPlaceholder="Search PO number, supplier, notes…"
        filters={[
          { param: "status", label: "Status", any: "All statuses", options: [
            { value: "DRAFT",     label: "Draft" },
            { value: "PLACED",    label: "Placed" },
            { value: "RECEIVED",  label: "Received" },
            { value: "CANCELLED", label: "Cancelled" },
          ]},
          { param: "supplier", label: "Supplier", any: "All suppliers",
            options: suppliers.map((s) => ({ value: s.id, label: s.name })) },
        ]}
      />

      <Card>
        <CardContent className="p-0">
          <POClient
            rows={pos.map((p) => ({
              id: p.id,
              poNumber: p.poNumber,
              supplierName: p.supplier.name,
              supplierId: p.supplier.id,
              status: p.status,
              total: Number(p.total),
              itemCount: p.items.reduce((s, it) => s + it.quantity, 0),
              items: p.items.map((it) => ({ name: it.name, quantity: it.quantity, unitCost: Number(it.unitCost) })),
              notes: p.notes,
              expectedAt: p.expectedAt?.toISOString() ?? null,
              receivedAt: p.receivedAt?.toISOString() ?? null,
              createdAt: p.createdAt.toISOString(),
              createdBy: p.createdByAdmin?.name ?? p.createdByAdmin?.email ?? null,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
