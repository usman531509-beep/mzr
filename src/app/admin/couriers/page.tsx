import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Couriers</h1>
        <p className="text-sm text-muted-foreground">
          Shipping carriers used to fulfil orders. The tracking URL is where customers go to track a shipment.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 lg:p-5">
          <CouriersClient rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
