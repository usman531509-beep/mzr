import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/app/account/profile/form";
import { AddressesClient } from "@/components/account/AddressesClient";
import { Separator } from "@/components/ui/separator";

// Per-request render — pulls the current user's stored profile fields.
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [user, addresses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true, address: true, city: true, country: true },
    }),
    prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  if (!user) return null;

  return (
    <div className="space-y-8">
      <ProfileForm initial={user} />

      <Separator />

      <section className="space-y-4">
        <header>
          <h2 className="text-lg font-semibold tracking-tight">Saved addresses</h2>
          <p className="text-sm text-muted-foreground">
            Save the places you ship to so you don&apos;t have to retype them at
            checkout. Pick a default — that&apos;s the one we pre-select.
          </p>
        </header>

        <AddressesClient
          initial={addresses.map((a) => ({
            id: a.id,
            label: a.label,
            recipientName: a.recipientName,
            phone: a.phone,
            line1: a.line1,
            line2: a.line2,
            city: a.city,
            county: a.county,
            postcode: a.postcode,
            country: a.country,
            isDefault: a.isDefault,
          }))}
        />
      </section>
    </div>
  );
}
