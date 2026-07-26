import { prisma } from "@/lib/prisma";
import { TrackClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Track your order",
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function TrackPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const courierParam = typeof sp.courier === "string" ? sp.courier : "";
  const numberParam = typeof sp.number === "string" ? sp.number : "";

  const couriers = await prisma.courier.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, trackingUrl: true, logoUrl: true },
  });

  // Pre-select a courier if the URL matches one by name or slug.
  const initial = courierParam
    ? couriers.find(
        (c) => c.name.toLowerCase() === courierParam.toLowerCase() || c.slug === courierParam.toLowerCase(),
      )
    : null;

  return (
    <div className="container">
      <div className="auth">
        <h1>Track your order</h1>
        <p className="sub">
          Pick the courier you were given, enter your tracking number, and we&apos;ll send you to their tracking page.
        </p>

        <TrackClient
          couriers={couriers}
          initialCourierId={initial?.id ?? ""}
          initialNumber={numberParam}
        />

        <div className="hr" />
        <p className="muted center" style={{ fontSize: 13, margin: 0 }}>
          You can also find tracking links on your{" "}
          <a href="/account/orders">My orders</a> page.
        </p>
      </div>
    </div>
  );
}
