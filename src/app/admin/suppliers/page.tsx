import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { SuppliersClient } from "@/components/admin/SuppliersClient";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function SuppliersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const active = typeof sp.active === "string" ? sp.active : "";

  const where: Prisma.SupplierWhereInput = {};
  if (q) {
    where.OR = [
      { name:        { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
      { email:       { contains: q, mode: "insensitive" } },
      { phone:       { contains: q, mode: "insensitive" } },
      { city:        { contains: q, mode: "insensitive" } },
      { country:     { contains: q, mode: "insensitive" } },
    ];
  }
  if (active === "yes") where.active = true;
  else if (active === "no") where.active = false;

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { purchaseOrders: true } },
      purchaseOrders: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          poNumber: true,
          status: true,
          total: true,
          createdAt: true,
          items: { select: { name: true, quantity: true } },
        },
      },
    },
  });

  const rows = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    contactName: s.contactName,
    email: s.email,
    phone: s.phone,
    address: s.address,
    city: s.city,
    country: s.country,
    notes: s.notes,
    active: s.active,
    poCount: s._count.purchaseOrders,
    purchaseOrders: s.purchaseOrders.map((p) => ({
      id: p.id,
      poNumber: p.poNumber,
      status: p.status,
      total: Number(p.total),
      createdAt: p.createdAt.toISOString(),
      items: p.items,
    })),
  }));

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
        <p className="text-sm text-muted-foreground">
          Parts vendors with their contact details and purchase history.
        </p>
      </div>

      <AdminFilterBar
        searchPlaceholder="Search name, contact, email, phone, city…"
        filters={[
          { param: "active", label: "Status", any: "Any status", options: [
            { value: "yes", label: "Active" },
            { value: "no",  label: "Inactive" },
          ]},
        ]}
      />

      <Card>
        <CardContent className="p-4 lg:p-5">
          <SuppliersClient rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
