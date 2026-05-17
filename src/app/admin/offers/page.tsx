import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { OffersClient } from "@/components/admin/OffersClient";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const offers = await prisma.offer.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Offers</h1>
        <p className="text-sm text-muted-foreground">
          Messages shown in the storefront top bar. When no offer is active the
          bar is hidden site-wide.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 lg:p-5">
          <OffersClient
            rows={offers.map((o) => ({
              id: o.id,
              text: o.text,
              icon: o.icon,
              active: o.active,
              position: o.position,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
