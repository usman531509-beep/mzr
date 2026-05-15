import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="mx-auto max-w-2xl px-4 py-10 lg:py-14">
      <header className="mb-6 text-center">
        <h1 className="font-head text-3xl font-black tracking-tight">Track your order</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick the courier you were given, enter your tracking number, and we&apos;ll send you to their tracking page.
        </p>
      </header>

      <Card>
        <CardContent className="p-6">
          <TrackClient
            couriers={couriers}
            initialCourierId={initial?.id ?? ""}
            initialNumber={numberParam}
          />
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        You can also find tracking links on your{" "}
        <a href="/account/orders" className="underline-offset-2 hover:underline">My orders</a> page.
      </p>
    </div>
  );
}
