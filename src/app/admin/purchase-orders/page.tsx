import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Plus } from "lucide-react";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { POClient } from "@/components/admin/POClient";
import { Pagination } from "@/components/Pagination";
import { parsePagination } from "@/lib/pagination";
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

  const { page, pageSize, skip, take } = parsePagination(sp, { defaultSize: 25 });

  const [pos, total, suppliers] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: {
          select: {
            id: true, name: true, contactName: true, email: true,
            phone: true, address: true, city: true, country: true,
          },
        },
        items: {
          select: {
            id: true, name: true, sku: true, quantity: true, unitCost: true,
          },
        },
        createdByAdmin: { select: { name: true, email: true } },
      },
      skip,
      take,
    }),
    prisma.purchaseOrder.count({ where }),
    prisma.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="adm-top !mb-0">
        <div>
          <div className="crumb">Admin</div>
          <h1 className="font-head text-3xl font-normal uppercase leading-none tracking-wide">Purchase Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record what you order from suppliers. Each PO is a printable
            procurement document — it doesn&apos;t change stock on its own.
          </p>
        </div>
        <Link href="/admin/purchase-orders/new" className="btn-red !px-4 !py-2.5 hover:no-underline">
          <Plus className="h-3.5 w-3.5" /> New purchase order
        </Link>
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

      <div className="table-wrap">
          <POClient
            rows={pos.map((p) => ({
              id: p.id,
              poNumber: p.poNumber,
              supplierName: p.supplier.name,
              supplierId: p.supplier.id,
              supplier: {
                name: p.supplier.name,
                contactName: p.supplier.contactName,
                email: p.supplier.email,
                phone: p.supplier.phone,
                address: p.supplier.address,
                city: p.supplier.city,
                country: p.supplier.country,
              },
              status: p.status,
              total: Number(p.total),
              itemCount: p.items.reduce((s, it) => s + it.quantity, 0),
              items: p.items.map((it) => ({
                name: it.name,
                sku: it.sku,
                quantity: it.quantity,
                unitCost: Number(it.unitCost),
              })),
              notes: p.notes,
              expectedAt: p.expectedAt?.toISOString() ?? null,
              receivedAt: p.receivedAt?.toISOString() ?? null,
              createdAt: p.createdAt.toISOString(),
              createdBy: p.createdByAdmin?.name ?? p.createdByAdmin?.email ?? null,
            }))}
          />
          <Pagination
            total={total}
            pageSize={pageSize}
            currentPage={page}
            className="px-3 pb-2"
          />
      </div>
    </div>
  );
}
