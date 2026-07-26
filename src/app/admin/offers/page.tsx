import { prisma } from "@/lib/prisma";
import { OffersClient } from "@/components/admin/OffersClient";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const offers = await prisma.offer.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div className="adm-top !mb-0">
        <div>
          <div className="crumb">Admin</div>
          <h1 className="font-head text-3xl font-normal uppercase leading-none tracking-wide">Offers (top bar)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Messages shown in the storefront top bar. When no offer is active the
            bar is hidden site-wide.
          </p>
        </div>
      </div>

      <div className="panel">
        <OffersClient
          rows={offers.map((o) => ({
            id: o.id,
            text: o.text,
            icon: o.icon,
            active: o.active,
            position: o.position,
          }))}
        />
      </div>
    </div>
  );
}
