import { prisma } from "@/lib/prisma";
import { CouriersClient } from "@/components/admin/CouriersClient";

export const dynamic = "force-dynamic";

export default async function CouriersPage() {
  const couriers = await prisma.courier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { orders: true } } },
  });

  const rows = couriers.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    trackingUrl: c.trackingUrl,
    logoUrl: c.logoUrl,
    active: c.active,
    orderCount: c._count.orders,
  }));

  return (
    <div className="space-y-4">
      <div className="adm-top !mb-0">
        <div>
          <div className="crumb">Admin</div>
          <h1 className="font-head text-3xl font-normal uppercase leading-none tracking-wide">Couriers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shipping carriers used to fulfil orders. The tracking URL is where customers go to track a shipment.
          </p>
        </div>
      </div>

      <CouriersClient rows={rows} />
    </div>
  );
}
