import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuthShell } from "@/components/AuthShell";
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
    <AuthShell>
      <h1>Track your order</h1>
      <p className="sub">
        Pick your courier, enter your tracking number, and we&apos;ll take you
        straight to their tracking page.
      </p>

      <TrackClient
        couriers={couriers}
        initialCourierId={initial?.id ?? ""}
        initialNumber={numberParam}
      />

      <p className="h-auth-alt">
        You can also find tracking links on your{" "}
        <Link href="/account/orders">My orders</Link> page.
      </p>
    </AuthShell>
  );
}
